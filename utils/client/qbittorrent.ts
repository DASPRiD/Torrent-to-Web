import type { Client, ClientConfig, SendOptions } from "./index";
import { fetchExtractCookies, fetchWithCookies, spoofOrigin } from "./utils";

const loginPath = "/api/v2/auth/login";
const addTorrentPath = "/api/v2/torrents/add";

export class QBittorrent implements Client {
    public static readonly supportsLabels = true;

    private readonly config: ClientConfig;

    public constructor(config: ClientConfig) {
        this.config = config;
    }

    public async sendTorrent(filename: string, torrent: Blob, options: SendOptions): Promise<void> {
        const formData = new FormData();
        formData.set("torrents", torrent, filename);
        this.applyCommonFields(formData, options);

        return this.sendRequest(formData);
    }

    public async sendMagnetUrl(url: string, options: SendOptions): Promise<void> {
        const formData = new FormData();
        formData.set("urls", `${url}\n`);
        this.applyCommonFields(formData, options);

        return this.sendRequest(formData);
    }

    private applyCommonFields(formData: FormData, options: SendOptions): void {
        if (!this.config.autostart) {
            formData.set("paused", "true");
        }

        if (options.label !== undefined) {
            formData.set("category", options.label);
        }
    }

    // The spoofOrigin patterns have to be built the same way as the requests they are meant to
    // match, or the listener never fires and qBittorrent rejects the login on its CSRF check.
    private apiUrl(path: string): string {
        const url = new URL(this.config.url);
        url.pathname = `${url.pathname.replace(/\/$/, "")}${path}`;
        return url.toString();
    }

    private async sendRequest(formData: FormData): Promise<void> {
        const origin = new URL(this.config.url);
        const loginUrl = this.apiUrl(loginPath);
        const addTorrentUrl = this.apiUrl(addTorrentPath);

        await spoofOrigin(
            async () => {
                const cookies = await this.login();

                const response = await fetchWithCookies(
                    new Request(addTorrentUrl, {
                        method: "POST",
                        body: formData,
                    }),
                    cookies,
                );

                if (!response.ok) {
                    throw new Error("Request failed");
                }
            },
            [loginUrl, addTorrentUrl],
            `${origin.protocol}//${origin.host}`,
        );
    }

    private async login(): Promise<string> {
        const [response, cookies] = await fetchExtractCookies(
            new Request(this.apiUrl(loginPath), {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    username: this.config.username,
                    password: this.config.password,
                }),
            }),
        );

        if (!response.ok) {
            throw new Error("Login failed");
        }

        return cookies;
    }
}
