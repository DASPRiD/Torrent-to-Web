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

const notifyType = {
    NOTICE: 'notice',
    ERROR: 'error',
};

torrentToWeb.processUrl = function (nid, url, ref) {
    if (url.startsWith('magnet:')) {
        torrentToWeb.notify('Sending magnet link');
        torrentToWeb.createAdapter(nid, function (adapter) {
            adapter.send(url, null, function (success) {
                if (typeof success === 'boolean') {
                    if (success) {
                        torrentToWeb.notify('Magnet link sent');
                        return;
                    }

                    torrentToWeb.notify('Error while sending magnet link', notifyType.ERROR);
                    return;
                }

                torrentToWeb.notify('Could not send magnet link:<br/>' + success.toString(), notifyType.ERROR);
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
            torrentToWeb.notify('Could not download torrent file:<br/>'
                                + response.status + response.statustext, notifyType.ERROR);
            return;
        }

        let ctype = response.headers.get('content-type');

        if (! ctype.match(/(application\/x-bittorrent|application\/octet-stream)/gi)) {
            torrentToWeb.notify('Downloaded Content-Type "' + ctype + '" is invalid', notifyType.ERROR);
            return;
        }

        response.blob().then(function (blob) {
            torrentToWeb.determineFilename(blob).then(function (filename) {
                if (filename === false) {
                    torrentToWeb.notify('Downloaded file is not a torrent', notifyType.ERROR);
                    return;
                }

                torrentToWeb.notify('Uploading torrent file');
                torrentToWeb.createAdapter(nid, function (adapter) {
                    adapter.send(filename, blob, function (success) {
                        if (typeof success === 'boolean') {
                            if (success) {
                                torrentToWeb.notify('Torrent file uploaded');
                                return;
                            }

                            torrentToWeb.notify('Error while uploading torrent file', notifyType.ERROR);
                            return;
                        }

                        torrentToWeb.notify('Could not upload torrent file:<br/>' + success.toString());
                    });
                });
            });
        });
    });
};

torrentToWeb.createAdapter = function (nid, callback) {
    browser.storage.local.get().then((profiles) => {
        for (let name in profiles) {
            let p = profiles[name];

            if ((nid === 0 && p.magnet) || (nid > 0 && p.nid === nid)) {
                callback(torrentToWeb.adapter[p.adapter](
                    p.url,
                    p.username,
                    p.password,
                    p.autostart
                ));

                // If this was a left-click, do not return but
                // continue iterating profiles. => Multiple adapters
                // may be configured to handle left-clicks.
                if (nid > 0) {
                    return;
                }
            }
        }
    }, (error) => {
        torrentToWeb.notify('Could not load profile:<br/>' + error.toString(), notifyType.ERROR);
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

torrentToWeb.notify = function (message, ntype = notifyType.NOTICE) {
    let iconUrl;
    switch (ntype) {
        case notifyType.ERROR:
            iconUrl = browser.runtime.getURL('icons/error-48.png');
        break;
        default:
            iconUrl = browser.runtime.getURL('icons/icon-48.png');
        break;
    }
    browser.notifications.create(
        'transfer_notification',
        {
            type: 'basic',
            iconUrl: iconUrl,
            title: 'Torrent to Web',
            message: message,
        }
    );
};

torrentToWeb.createContextMenu = function () {
    browser.contextMenus.removeAll().then(() => {
        browser.storage.local.get().then((profiles) => {
            for (let name in profiles) {
                let p = profiles[name];

                // Bind context menu item
                if (p.hasOwnProperty('nid')) {
                    browser.contextMenus.create({
                        id: 'send-to-torrent-client-' + p.nid.toString(),
                        title: 'Send torrent to ' + name,
                        contexts: ['link'],
                    });
                }
            }
        }, (error) => {
            torrentToWeb.notify('Could not load profile:<br/>' + error.toString(), notifyType.ERROR);
        });
    });
};

// Name mapping of migrated torrent profile
const migratedClientNames = {
    deluge: 'Deluge',
    qbittorrent: 'qBittorrent',
    rutorrent: 'ruTorrent',
    transmission: 'Transmission/Vuze/Azureus',
};

// Migrate old options to a named profile
browser.runtime.onInstalled.addListener(function (details) {
    if (details.previousVersion && details.previousVersion === '1.3.0') {
        browser.storage.local.get().then((old) => {
            if (old.hasOwnProperty('adapter')) {
                browser.storage.local.clear().then(() => {
                    const migrated = migratedClientNames[old.adapter] + ' (migrated)';

                    let profiles = {};
                    profiles[migrated] = {
                        nid: 1,
                        adapter: old.adapter,
                        url: old.url,
                        username: old.username,
                        password: old.password,
                        autostart: old.autostart,
                        magnet: true,
                    };
                    browser.storage.local.set(profiles).then(() => {
                        console.log('profile migrated');
                    }, (error) => {
                        console.log(error);
                    });
                }, (error) => {
                    console.log(error);
                });
            }
        }, (error) => {
            console.log(error);
        });
    }
});

torrentToWeb.createContextMenu();

browser.storage.onChanged.addListener(function () {
    torrentToWeb.createContextMenu();
});

browser.contextMenus.onClicked.addListener(function (info) {
    let re = /^send-to-torrent-client-/;

    if (re.test(info.menuItemId)) {
        // Determine profile id
        let nid = parseInt(info.menuItemId.replace(re, ''), 10);

        // Determine referrer
        let ref = (info.frameUrl) ? info.frameUrl : info.pageUrl;
        torrentToWeb.processUrl(nid, info.linkUrl, ref);
    }
});

browser.runtime.onMessage.addListener(function (msg) {
    if (msg.hasOwnProperty('magnet')) {
        torrentToWeb.processUrl(0, msg.magnet, null);
        return;
    }

    if (msg.hasOwnProperty('test')) {
        let adapter = torrentToWeb.adapter[msg.test.adapter](
            msg.test.url,
            msg.test.username,
            msg.test.password,
            msg.test.autostart,
        );
        adapter.send('test.torrent', msg.test.data, function (success) {
            if (typeof success === 'boolean') {
                if (success) {
                    torrentToWeb.notify('Upload test successful');
                    return;
                }

                torrentToWeb.notify('Error while testing torrent upload', notifyType.ERROR);
                return;
            }

            torrentToWeb.notify('Torrent upload test to ' + msg.test.url + ' failed:<br/>'
                                + success.toString(), notifyType.ERROR);
        });
    }
});
