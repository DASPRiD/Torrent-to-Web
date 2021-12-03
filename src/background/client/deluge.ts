import {encode} from 'base64-arraybuffer';
import {fetchExtractCookies, fetchWithCookies} from './utils';
import type {Client, ClientConfig} from './index';

export default class Deluge implements Client {
    private readonly config : ClientConfig;
    private readonly url : URL;

    public constructor(config : ClientConfig) {
        this.config = config;
        this.url = new URL(this.config.url);
        this.url.pathname += '/json';
    }

    public async sendTorrent(filename : string, torrent : Blob) : Promise<void> {
        const arrayBuffer = await torrent.arrayBuffer();

        return this.sendRequest({
            id: '2',
            method: 'core.add_torrent_file',
            params: [filename, encode(arrayBuffer), {add_paused: !this.config.autostart}],
        });
    }

    public async sendMagnetUrl(url : string) : Promise<void> {
        return this.sendRequest({
            id: '2',
            method: 'core.add_torrent_magnet',
            params: [url, {add_paused: !this.config.autostart}],
        });
    }

    private async sendRequest(data : Record<string, unknown>) : Promise<void> {
        const cookies = await this.login();

        const response = await fetchWithCookies(new Request(this.url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        }), cookies);

        if (!response.ok) {
            throw new Error('Request failed');
        }
    }

    private async login() : Promise<string> {
        const [response, cookies] = await fetchExtractCookies(new Request(this.url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: '1',
                method: 'auth.login',
                params: [this.config.password],
            }),
        }));

        if (!response.ok) {
            throw new Error('Login failed');
        }

        return cookies;
    }
}
