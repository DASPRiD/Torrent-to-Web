import {browser} from 'webextension-polyfill-ts';
import {z} from 'zod';
import type {ClientConfig} from './client';
import {clientNames, clients} from './client';
import {processUrl} from './process';
import type {Profile} from './profiles';
import {getProfiles} from './profiles';
import ProgressNotification from './progressNotification';

const handleUncaught = (error : unknown) => {
    console.error(`Uncaught error: ${error instanceof Error ? error.toString() : 'Unknown'}`);
};

const createContextMenu = async () : Promise<void> => {
    await browser.contextMenus.removeAll();
    const profiles = await getProfiles();

    for (const profile of profiles) {
        browser.contextMenus.create({
            id: `send-to-torrent-client-${profile.id}`,
            title: `Send torrent to ${profile.name}`,
            contexts: ['link'],
        });
    }
};

browser.storage.onChanged.addListener(() => {
    createContextMenu().catch(handleUncaught);
});

createContextMenu().catch(handleUncaught);

const contextMenuIdRegexp = /^send-to-torrent-client-(\d+)$/;

browser.contextMenus.onClicked.addListener(info => {
    if (typeof info.menuItemId !== 'string' || !info.linkUrl) {
        return;
    }

    const result = contextMenuIdRegexp.exec(info.menuItemId);

    if (!result) {
        return;
    }

    const profileId = parseInt(result[1], 10);
    const referrer = info.frameUrl ?? info.pageUrl;

    processUrl(info.linkUrl, referrer, profileId).catch(handleUncaught);
});

const legacyProfileSchema = z.object({
    nid: z.number().int().positive(),
    adapter: z.enum(clientNames),
    url: z.string().url(),
    username: z.string(),
    password: z.string(),
    magnet: z.boolean(),
    autostart: z.boolean(),
});

browser.runtime.onInstalled.addListener(details => {
    if (!details.previousVersion || !details.previousVersion.startsWith('1.')) {
        return;
    }

    const profiles : Profile[] = [];

    (async () => {
        const legacyProfiles = await browser.storage.local.get();

        for (const [name, legacyProfile] of Object.keys(legacyProfiles)) {
            const parseResult = legacyProfileSchema.safeParse(legacyProfile);

            if (parseResult.success) {
                profiles.push({
                    id: parseResult.data.nid,
                    name,
                    client: parseResult.data.adapter,
                    url: parseResult.data.url,
                    username: parseResult.data.username,
                    password: parseResult.data.password,
                    autostart: parseResult.data.autostart,
                    handleLeftClick: parseResult.data.magnet,
                });
            }
        }

        await browser.storage.local.set({profiles: profiles});
    })().catch(handleUncaught);
});

type RuntimeMessage = {
    magnetUrl ?: string;
    test ?: ClientConfig & {client : keyof typeof clients};
};

const testTorrentData = 'ZDg6YW5ub3VuY2UxNjpodHRwOi8vbG9jYWxob3N0MTM6Y3JlYXRpb24gZGF0ZWkxNTY2NDM0ODM0ZTQ6aW5mb2Q2Omxlbm'
    + 'd0aGkxM2U0Om5hbWUzMTpUZXN0IHVwbG9hZGVkIGJ5IFRvcnJlbnQtdG8tV2ViMTI6cGllY2UgbGVuZ3RoaTE2Mzg0ZTY6cGllY2VzMjA6XjPmGK'
    + '6+JxCgRs155fReXiO82g1lZQ==';

const createTestTorrent = async () : Promise<Blob> => {
    const response = await fetch(`data:application/x-bittorrent;base64,${testTorrentData}`);
    return response.blob();
};

browser.runtime.onMessage.addListener((message : RuntimeMessage) => {
    if (message.magnetUrl) {
        processUrl(message.magnetUrl, undefined, undefined).catch(handleUncaught);
    }

    if (message.test) {
        const {test} = message;

        (async () => {
            const notification = await ProgressNotification.create('Testing profile');
            const client = new clients[test.client](test);
            const testTorrent = await createTestTorrent();

            try {
                await client.sendTorrent('test.torrent', testTorrent);
            } catch (error) {
                await notification.error('Error occurred when testing profile');
                console.debug(`Send error: ${error instanceof Error ? error.toString() : 'Unknown'}`);
                return;
            }

            await notification.success('Upload test succeeded');
        })().catch(handleUncaught);
    }
});
