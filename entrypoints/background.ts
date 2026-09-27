import { z } from "zod";
import { type ClientConfig, clientNames, clients } from "../utils/client";

const handleUncaught = (error: unknown) => {
    console.error(`Uncaught error: ${error instanceof Error ? error.toString() : "Unknown"}`);
};

const createContextMenu = async (): Promise<void> => {
    await browser.contextMenus.removeAll();
    const profiles = await getProfiles();

    for (const profile of profiles) {
        const parentId = `send-to-torrent-client-${profile.id}`;

        browser.contextMenus.create({
            id: parentId,
            title: `Send torrent to ${profile.name}`,
            contexts: ["link"],
        });

        if (profile.labels.length === 0) {
            continue;
        }

        browser.contextMenus.create({
            id: `${parentId}-nolabel`,
            parentId,
            title: "No label",
            contexts: ["link"],
        });

        browser.contextMenus.create({
            id: `${parentId}-separator`,
            parentId,
            type: "separator",
            contexts: ["link"],
        });

        // The label travels in the id itself rather than an index into the profile, so the click
        // handler never has to re-read storage and cannot resolve against a list that changed
        // since the menu was built.
        for (const label of profile.labels) {
            browser.contextMenus.create({
                id: `${parentId}-label-${encodeURIComponent(label)}`,
                parentId,
                title: label,
                contexts: ["link"],
            });
        }
    }
};

// removeAll and create are awaited apart, so two overlapping rebuilds can both clear before
// either creates, and the second run then fails on ids the first already added.
let contextMenuUpdate = Promise.resolve();

const queueContextMenuUpdate = () => {
    contextMenuUpdate = contextMenuUpdate.then(createContextMenu).catch(handleUncaught);
};

const contextMenuIdRegexp = /^send-to-torrent-client-(\d+)(?:-nolabel|-label-(.+))?$/;

const legacyProfileSchema = z.object({
    nid: z.int().positive(),
    adapter: z.enum(clientNames),
    url: z.url(),
    username: z.string(),
    password: z.string(),
    magnet: z.boolean(),
    autostart: z.boolean(),
});

type RuntimeMessage = {
    magnetUrl?: string;
    test?: ClientConfig & { client: keyof typeof clients };
};

const testTorrentData =
    "ZDg6YW5ub3VuY2UxNjpodHRwOi8vbG9jYWxob3N0MTM6Y3JlYXRpb24gZGF0ZWkxNTY2NDM0ODM0ZTQ6aW5mb2Q2Omxlbm" +
    "d0aGkxM2U0Om5hbWUzMTpUZXN0IHVwbG9hZGVkIGJ5IFRvcnJlbnQtdG8tV2ViMTI6cGllY2UgbGVuZ3RoaTE2Mzg0ZTY6cGllY2VzMjA6XjPmGK" +
    "6+JxCgRs155fReXiO82g1lZQ==";

const createTestTorrent = async (): Promise<Blob> => {
    const response = await fetch(`data:application/x-bittorrent;base64,${testTorrentData}`);
    return response.blob();
};

export default defineBackground({
    // Blocking webRequest listeners are registered from here, which an event page cannot keep
    // alive between requests.
    persistent: true,

    main() {
        browser.storage.onChanged.addListener(queueContextMenuUpdate);
        queueContextMenuUpdate();

        browser.contextMenus.onClicked.addListener((info) => {
            if (typeof info.menuItemId !== "string" || !info.linkUrl) {
                return;
            }

            const [, profileIdText, labelText] = contextMenuIdRegexp.exec(info.menuItemId) ?? [];

            if (profileIdText === undefined) {
                return;
            }

            const profileId = Number.parseInt(profileIdText, 10);
            const referrer = info.frameUrl ?? info.pageUrl;
            const label = labelText === undefined ? undefined : decodeURIComponent(labelText);

            processUrl(info.linkUrl, referrer, profileId, { label }).catch(handleUncaught);
        });

        browser.runtime.onInstalled.addListener((details) => {
            if (!details.previousVersion?.startsWith("1.")) {
                return;
            }

            const profiles: Profile[] = [];

            (async () => {
                const legacyProfiles = await browser.storage.local.get();

                for (const [name, legacyProfile] of Object.entries(legacyProfiles)) {
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
                            labels: [],
                        });
                    }
                }

                await browser.storage.local.set({ profiles: profiles });
            })().catch(handleUncaught);
        });

        browser.runtime.onMessage.addListener((message: RuntimeMessage) => {
            if (message.magnetUrl) {
                processUrl(message.magnetUrl, undefined, undefined, {}).catch(handleUncaught);
            }

            if (message.test) {
                const { test } = message;

                (async () => {
                    const notification = await ProgressNotification.create("Testing profile");
                    const client = new clients[test.client](test);
                    const testTorrent = await createTestTorrent();

                    try {
                        await client.sendTorrent("test.torrent", testTorrent, {});
                    } catch (error) {
                        await notification.error("Error occurred when testing profile");
                        console.debug(
                            `Send error: ${error instanceof Error ? error.toString() : "Unknown"}`,
                        );
                        return;
                    }

                    await notification.success("Upload test succeeded");
                })().catch(handleUncaught);
            }
        });
    },
});
