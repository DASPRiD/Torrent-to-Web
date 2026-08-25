import type { Client, ClientConfig, SendOptions } from "./index";

export class RuTorrent implements Client {
    public static readonly supportsLabels = true;

    private readonly config: ClientConfig;

    public constructor(config: ClientConfig) {
        this.config = config;
    }

    public async sendTorrent(filename: string, torrent: Blob, options: SendOptions): Promise<void> {
        const formData = new FormData();
        formData.set("torrent_file", torrent, filename);
        this.applyCommonFields(formData, options);

        return this.sendRequest(formData);
    }

    public async sendMagnetUrl(url: string, options: SendOptions): Promise<void> {
        const formData = new FormData();
        formData.set("url", url);
        this.applyCommonFields(formData, options);

        return this.sendRequest(formData);
    }

    private applyCommonFields(formData: FormData, options: SendOptions): void {
        if (!this.config.autostart) {
            formData.set("torrents_start_stopped", "1");
        }

        if (options.label !== undefined) {
            formData.set("label", options.label);
        }
    }

    private async sendRequest(formData: FormData): Promise<void> {
        const url = new URL(this.config.url);
        url.pathname = `${url.pathname.replace(/\/$/, "")}/php/addtorrent.php`;

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                Authorization: `Basic ${window.btoa(`${this.config.username}:${this.config.password}`)}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Request failed");
        }
    }
}
