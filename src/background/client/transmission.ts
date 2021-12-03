import {encode} from 'base64-arraybuffer';
import type {Client, ClientConfig} from './index';

export default class Transmission implements Client {
    private readonly config : ClientConfig;

    public constructor(config : ClientConfig) {
        this.config = config;
    }

    public async sendTorrent(filename : string, torrent : Blob) : Promise<void> {
        const arrayBuffer = await torrent.arrayBuffer();

        return this.sendRequest({
            method: 'torrent-add',
            arguments: {
                metainfo: encode(arrayBuffer),
                paused: !this.config.autostart,
            },
        });
    }

    public async sendMagnetUrl(url : string) : Promise<void> {
        return this.sendRequest({
            method: 'torrent-add',
            arguments: {
                filename: url,
                paused: !this.config.autostart,
            },
        });
    }

    private async sendRequest(data : Record<string, unknown>, sessionId ?: string) : Promise<void> {
        const url = new URL(this.config.url);

        if (!url.pathname.endsWith('/transmission')) {
            url.pathname += '/transmission';
        }

        url.pathname += '/rpc';

        const headers : Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Basic ${window.btoa(`${this.config.username}:${this.config.password}`)}`,
        };

        if (sessionId) {
            headers['X-Transmission-Session-Id'] = sessionId;
        }

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (response.status === 409) {
            const sessionId = response.headers.get('X-Transmission-Session-Id');

            if (!sessionId) {
                throw new Error('CSRF response is missing session ID header');
            }

            return this.sendRequest(data, sessionId);
        }

        if (response.status !== 200) {
            throw new Error('Request failed');
        }

        const result = await response.json() as {
            result ?: string;
        };

        if (result.result !== 'success') {
            throw new Error('Request failed');
        }
    }
}
