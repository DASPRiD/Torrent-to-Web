import {fetchExtractCookies, fetchWithCookies, spoofOrigin} from './utils';
import type {Client, ClientConfig} from './index';

export default class QBittorrent implements Client {
    private readonly config : ClientConfig;

    public constructor(config : ClientConfig) {
        this.config = config;
    }

    public async sendTorrent(filename : string, torrent : Blob) : Promise<void> {
        const formData = new FormData();
        formData.set('torrents', torrent, filename);

        if (!this.config.autostart) {
            formData.set('paused', 'true');
        }

        return this.sendRequest(formData);
    }

    public async sendMagnetUrl(url : string) : Promise<void> {
        const formData = new FormData();
        formData.set('urls', `${url}\n`);

        if (!this.config.autostart) {
            formData.set('paused', 'true');
        }

        return this.sendRequest(formData);
    }

    private async sendRequest(formData : FormData) : Promise<void> {
        const origin = new URL(this.config.url);

        await spoofOrigin(
            async () => {
                const cookies = await this.login();

                const url = new URL(this.config.url);
                url.pathname += '/api/v2/torrents/add';

                const response = await fetchWithCookies(new Request(url.toString(), {
                    method: 'POST',
                    body: formData,
                }), cookies);

                if (!response.ok) {
                    throw new Error('Request failed');
                }
            },
            [
                `${this.config.url}/api/vs/auth/login`,
                `${this.config.url}/api/vs/torrents/add`,
            ],
            `${origin.protocol}//${origin.host}`,
        );
    }

    private async login() : Promise<string> {
        const url = new URL(this.config.url);
        url.pathname += '/api/v2/auth/login';

        const [response, cookies] = await fetchExtractCookies(new Request(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: new URLSearchParams({
                username: this.config.username,
                password: this.config.password,
            }),
        }));

        if (!response.ok) {
            throw new Error('Login failed');
        }

        return cookies;
    }
}
