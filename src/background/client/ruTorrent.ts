import type {Client, ClientConfig} from './index';

export default class RuTorrent implements Client {
    private readonly config : ClientConfig;

    public constructor(config : ClientConfig) {
        this.config = config;
    }

    public async sendTorrent(filename : string, torrent : Blob) : Promise<void> {
        const formData = new FormData();
        formData.set('torrent_file', torrent, filename);

        if (!this.config.autostart) {
            formData.set('torrents_start_stopped', '1');
        }

        return this.sendRequest(formData);
    }

    public async sendMagnetUrl(url : string) : Promise<void> {
        const formData = new FormData();
        formData.set('url', url);

        if (!this.config.autostart) {
            formData.set('torrents_start_stopped', '1');
        }

        return this.sendRequest(formData);
    }

    private async sendRequest(formData : FormData) : Promise<void> {
        const url = new URL(this.config.url);
        url.pathname += '/php/addtorrent.php';

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                Authorization: `Basic ${window.btoa(`${this.config.username}:${this.config.password}`)}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Request failed');
        }
    }
}
