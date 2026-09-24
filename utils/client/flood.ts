import { encode } from "base64-arraybuffer";
import type { Client, ClientConfig } from "./index";
import { fetchExtractCookies, fetchWithCookies } from "./utils";

const loginPath = "/api/auth/authenticate";
const addUrlsPath = "/api/torrents/add-urls";
const addFilesPath = "/api/torrents/add-files";

export class Flood implements Client {
    private readonly config: ClientConfig;

    public constructor(config: ClientConfig) {
        this.config = config;
    }

    public async sendTorrent(_filename: string, torrent: Blob): Promise<void> {
        const arrayBuffer = await torrent.arrayBuffer();

        return this.sendRequest(addFilesPath, {
            files: [encode(arrayBuffer)],
            start: this.config.autostart,
        });
    }

    public async sendMagnetUrl(url: string): Promise<void> {
        return this.sendRequest(addUrlsPath, {
            urls: [url],
            start: this.config.autostart,
        });
    }

    private apiUrl(path: string): string {
        const url = new URL(this.config.url);
        url.pathname = `${url.pathname.replace(/\/$/, "")}${path}`;
        return url.toString();
    }

    private async sendRequest(path: string, data: Record<string, unknown>): Promise<void> {
        const cookies = await this.login();

        const response = await fetchWithCookies(
            new Request(this.apiUrl(path), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            }),
            cookies,
        );

        // An rTorrent-backed Flood answers every successful add with 202 and no hashes, so this
        // can't narrow to status 200 the way the Transmission client does.
        if (!response.ok) {
            throw new Error("Request failed");
        }
    }

    private async login(): Promise<string> {
        const [response, cookies] = await fetchExtractCookies(
            new Request(this.apiUrl(loginPath), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
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
