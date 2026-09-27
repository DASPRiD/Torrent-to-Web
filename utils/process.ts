import { z } from "zod";
import { decode } from "./bencode";
import type { Client, SendOptions } from "./client";
import { clients } from "./client";
import { getProfiles } from "./profiles";
import { ProgressNotification } from "./progressNotification";

const torrentSchema = z.object({
    info: z.object({
        name: z.union([
            z.string(),
            z.object({
                utf8: z.string(),
            }),
        ]),
    }),
});

const determineFilename = async (blob: Blob): Promise<string> => {
    const arrayBuffer = await blob.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const torrent = torrentSchema.parse(decode(data));

    if (typeof torrent.info.name === "string") {
        return torrent.info.name;
    }

    return torrent.info.name.utf8;
};

const createClient = async (profileId: number): Promise<Client> => {
    const profiles = await getProfiles();
    const profile = profiles.find((profile) => profile.id === profileId);

    if (!profile) {
        throw new Error(`Could not find profile with id ${profileId}`);
    }

    const clientConstructor = clients[profile.client];
    return new clientConstructor(profile);
};

const processMagnetUrl = async (
    url: string,
    profileId: number | undefined,
    options: SendOptions,
): Promise<void> => {
    const notification = await ProgressNotification.create("Sending magnet URL to client(s)");
    let clients: Client[];

    if (profileId) {
        clients = [await createClient(profileId)];
    } else {
        clients = await Promise.all(
            (await getProfiles())
                .filter((profile) => profile.handleLeftClick)
                .map(async (profile) => createClient(profile.id)),
        );
    }

    if (clients.length === 0) {
        await notification.error("No profile is set to handle magnet links");
        return;
    }

    for (const client of clients) {
        try {
            await client.sendMagnetUrl(url, options);
        } catch (error) {
            await notification.error("Failed to send magnet URL to client");
            console.debug(`Send error: ${error instanceof Error ? error.toString() : "Unknown"}`);
        }
    }

    await notification.success("Magnet URL sent to client(s)");
};

const processTorrent = async (
    url: string,
    referrer: string | undefined,
    profileId: number,
    options: SendOptions,
): Promise<void> => {
    const notification = await ProgressNotification.create("Retrieving torrent file");

    const response = await fetch(url, {
        method: "GET",
        credentials: "same-origin",
        referrer,
    });

    if (response.status !== 200) {
        await notification.error("Failed to download torrent file");
        console.debug(`Response status: ${response.statusText}`);
        return;
    }

    const contentType = response.headers.get("content-type");

    if (!contentType?.match(/(application\/x-bittorrent|application\/octet-stream)/gi)) {
        await notification.error("Request returned invalid content-type");
        console.debug(`Content-Type: ${contentType ?? "Unknown"}`);
        return;
    }

    const blob = await response.blob();
    let filename: string;

    try {
        filename = await determineFilename(blob);
    } catch (error) {
        await notification.error("Received invalid torrent file");
        console.debug(
            `Torrent parse error: ${error instanceof Error ? error.toString() : "Unknown"}`,
        );
        return;
    }

    const client = await createClient(profileId);

    try {
        await client.sendTorrent(filename, blob, options);
    } catch (error) {
        await notification.error("Failed to send torrent to client");
        console.debug(`Send error: ${error instanceof Error ? error.toString() : "Unknown"}`);
        return;
    }

    await notification.success(`Torrent file "${filename}" uploaded`);
};

export const processUrl = async (
    url: string,
    referrer: string | undefined,
    profileId: number | undefined,
    options: SendOptions,
): Promise<void> => {
    if (url.startsWith("magnet:")) {
        return processMagnetUrl(url, profileId, options);
    }

    if (!profileId) {
        throw new Error("Non magnet links require a profile ID");
    }

    return processTorrent(url, referrer, profileId, options);
};
