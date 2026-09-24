import { defineConfig } from "wxt";

export default defineConfig({
    manifestVersion: 2,
    manifest: {
        name: "Torrent to Web",
        description: "Allows to send torrent files to web clients.",
        // The notification icons are resolved through runtime.getURL, so they have to keep the
        // icons/ prefix rather than move to the root filenames WXT would otherwise discover.
        icons: {
            48: "/icons/icon-48.png",
        },
        browser_specific_settings: {
            gecko: {
                id: "torrent-to-web@dasprids.de",
                strict_min_version: "115.0",
            },
        },
        permissions: [
            "<all_urls>",
            "contextMenus",
            "notifications",
            "storage",
            "webRequest",
            "webRequestBlocking",
        ],
        web_accessible_resources: [
            {
                matches: ["<all_urls>"],
                resources: ["icons/error.png"],
            },
        ],
    },
});
