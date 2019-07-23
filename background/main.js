'use strict';

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
            torrentToWeb.notify('Could not download torrent file:' + response.status);
            return;
        }

        let filename = torrentToWeb.determineFilename(response);
        let extension = filename.split('.').pop();

        if (extension !== 'torrent') {
            torrentToWeb.notify('File is not a torrent');
            return;
        }

        torrentToWeb.notify('Uploading torrent file');
        torrentToWeb.createAdapter(function (adapter) {
            response.blob().then(function (blob) {
                adapter.send(filename, blob, function (success) {
                    torrentToWeb.notify(success ? 'Torrent file uploaded' : 'Error while uploading torrent file');
                });
            });
        });
    });
};

torrentToWeb.createAdapter = function (callback) {
    browser.storage.local.get(function (options) {
        if (! options.adapter) {
            torrentToWeb.notify('Error: Missing configuration.');
        }

        callback(torrentToWeb.adapter[options.adapter](
            options.url,
            options.username,
            options.password,
            options.autostart
        ));
    });
};

torrentToWeb.determineFilename = function (response) {
    let filename = null;
    let result;
    let filenameHeader = response.headers.get('filename');
    let nameHeader = response.headers.get('name');
    let contentHeader = response.headers.get('content-disposition');

    if (filenameHeader !== null && filenameHeader !== '') {
        console.log('Found filename in "filename" header');
        filename = filenameHeader;
    } else if (nameHeader !== null && nameHeader !== '') {
        console.log('Found filename in "name" header');
        filename = nameHeader;
    } else if (contentHeader !== null && (result = contentHeader.match(/filename=(?:"([^"]+)"|([^;]+);?)/))) {
        console.log('Found filename in "content-disposition" header');
        filename = (typeof result[1] !== 'undefined' ? result[1] : result[2]);
    } else {
        console.log('Falling back to filename from URL');
        filename = new URL(response.url).pathname.split('/').pop();
    }

    filename = filename.replace(/[^0-9a-zA-Z.]+/g, '.');
    filename = filename.replace(/\.{2,}/g, '.');
    filename = filename.replace(/(^\.+|\.+$)/g, '');

    console.log('Using filename "' + filename + '"');
    return filename;
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
