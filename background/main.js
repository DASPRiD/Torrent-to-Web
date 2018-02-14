'use strict';

var torrentToWeb = (typeof torrentToWeb === 'undefined' ? {} : torrentToWeb);

torrentToWeb.processUrl = function (url) {
    torrentToWeb.notify('Retrieving torrent file');

    let request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.withCredentials = true;
    request.responseType = 'blob';
    request.onreadystatechange = function () {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            torrentToWeb.notify('Could not download torrent file:' + request.status);
            return;
        }

        let filename = torrentToWeb.determineFilename(request);
        let extension = filename.split('.').pop();

        if (extension !== 'torrent') {
            torrentToWeb.notify('File is not a torrent');
            return;
        }

        torrentToWeb.notify('Uploading torrent file');
        torrentToWeb.createAdapter(function (adapter) {
            adapter.send(filename, request.response, function (success) {
                torrentToWeb.notify(success ? 'Torrent file uploaded' : 'Error while uploading torrent file');
            });
        });
    };

    request.send(null);
};

torrentToWeb.createAdapter = function (callback) {
    chrome.storage.local.get(function (options) {
        callback(torrentToWeb.adapter[options.adapter](
            options.url,
            options.username,
            options.password,
            options.autostart
        ));
    });
};

torrentToWeb.determineFilename = function (request) {
    let filename = null;
    let result;
    let filenameHeader = request.getResponseHeader('filename');
    let nameHeader = request.getResponseHeader('name');
    let contentHeader = request.getResponseHeader('content-disposition');

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
        filename = new URL(request.responseURL).pathname.split('/').pop();
    }

    filename = filename.replace(/[^0-9a-zA-Z.]+/g, '.');
    filename = filename.replace(/\.{2,}/g, '.');
    filename = filename.replace(/(^\.+|\.+$)/g, '');

    console.log('Using filename "' + filename + '"');
    return filename;
};

torrentToWeb.notify = function (message) {
    browser.notifications.create(
        '',
        {
            type: 'basic',
            iconUrl: chrome.extension.getURL('icons/icon-48.png'),
            title: 'Torrent to Web',
            message: message,
        }
    );
};

// Bind context menu item
chrome.contextMenus.create({
    id: 'send-to-torrent-client',
    title: 'Send to Torrent client',
    contexts: ['link'],
});

chrome.contextMenus.onClicked.addListener(function (info) {
    if (info.menuItemId !== 'send-to-torrent-client') {
        return;
    }

    torrentToWeb.processUrl(info.linkUrl);
});
