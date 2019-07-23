'use strict';

// No need for FileReader anymore.
// See https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer#Polyfill
Object.defineProperty(Blob.prototype, 'arrayBuffer', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function arrayBuffer () {
        return new Response(this).arrayBuffer();
    },
});

let torrentToWeb = {
    adapter: {},
};

torrentToWeb.processUrl = function (url, ref) {
    if (url.startsWith('magnet:')) {
        torrentToWeb.notify('Sending magnet link');
        torrentToWeb.createAdapter(function (adapter) {
            adapter.send(url, null, function (success) {
                torrentToWeb.notify(success ? 'Magnet link sent' : 'Error while sending magnet link');
            });
        });

        return;
    }

    torrentToWeb.notify('Retrieving torrent file');

    const downloadRequest = new Request(url, {
        method: 'GET',
        credentials: 'same-origin',
        referrer: ref,
    });
    return fetch(downloadRequest).then((response) => {
        if (response.status !== 200) {
            torrentToWeb.notify('Could not download torrent file:'
                                + response.status + response.statustext);
            return;
        }

        let ctype = response.headers.get('content-type');

        if (! ctype.match(/(application\/x-bittorrent|application\/octet-stream)/gi)) {
            torrentToWeb.notify('Content-Type is invalid');
            return;
        }

        response.blob().then(function (blob) {
            torrentToWeb.determineFilename(blob).then(function (filename) {
                if (filename === false) {
                    torrentToWeb.notify('File is not a torrent');
                    return;
                }

                torrentToWeb.notify('Uploading torrent file');
                torrentToWeb.createAdapter(function (adapter) {
                    adapter.send(filename, blob, function (success) {
                        torrentToWeb.notify(success ? 'Torrent file uploaded' : 'Error while uploading torrent file');
                    });
                });
            });
        });
    });
};

torrentToWeb.createAdapter = function (callback) {
    browser.storage.local.get(function (options) {
        callback(torrentToWeb.adapter[options.adapter](
            options.url,
            options.username,
            options.password,
            options.autostart
        ));
    });
};

torrentToWeb.determineFilename = function (blob) {
    return new Promise((resolve) => {
        blob.arrayBuffer().then((buffer) => {
            let torrent;
            try {
                torrent = decode(buffer);
            } catch (error) {
                resolve(false);
                return;
            }

            if (torrent.info && (torrent.info.name || torrent.info.name.utf8)) {
                if (torrent.info.name.utf8) {
                    resolve(torrent.info.name.utf8);
                    return;
                }

                resolve(torrent.info.name);
                return;
            }

            resolve(false);
        });
    });
};

torrentToWeb.notify = function (message) {
    browser.notifications.create(
        'transfer_notification',

        {
            type: 'basic',
            iconUrl: browser.extension.getURL('icons/icon-48.png'),
            title: 'Torrent to Web',
            message: message,
        }
    );
};

// Bind context menu item
browser.contextMenus.create({
    id: 'send-to-torrent-client',
    title: 'Send to Torrent client',
    contexts: ['link'],
});

browser.contextMenus.onClicked.addListener(function (info) {
    if (info.menuItemId !== 'send-to-torrent-client') {
        return;
    }

    // Determine referrer
    let ref = (info.frameUrl) ? info.frameUrl : info.pageUrl;
    torrentToWeb.processUrl(info.linkUrl, ref);
});
