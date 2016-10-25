if (typeof torrentToWeb === 'undefined') {
    var torrentToWeb = {};
};

torrentToWeb.processUrl = function(url, notificationId)
{
    torrentToWeb.notify('Retrieving torrent file');

    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'blob';
    request.onreadystatechange = function(e) {
        if (request.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (request.status !== 200) {
            torrentToWeb.notify('Could not download torrent file:' + request.status);
            return;
        }

        var filename = torrentToWeb.determineFilename(request);
        var extension = filename.split('.').pop();

        if (extension !== 'torrent') {
            torrentToWeb.notify('File is not a torrent');
            return;
        }

        torrentToWeb.notify('Uploading torrent file');
        torrentToWeb.createAdapter(function(adapter) {
            adapter.send(filename, request.response, function(success) {
                torrentToWeb.notify(success ? 'Torrent file uploaded' : 'Error while uploading torrent file');
            });
        });
    };
    request.send(null);
};

torrentToWeb.createAdapter = function(callback)
{
    chrome.storage.local.get(function(options) {
        callback(torrentToWeb.adapter[options.adapter](
            options.url,
            options.username,
            options.password,
            options.autostart
        ));
    });
};

torrentToWeb.determineFilename = function(request)
{
    var filename = null, result;
    var filenameHeader = request.getResponseHeader('filename');
    var nameHeader = request.getResponseHeader('name');
    var contentHeader = request.getResponseHeader('content-disposition');

    if (filenameHeader !== null && filenameHeader !== '') {
        console.log('Found filename in "filename" header');
        filename = filenameHeader;
    } else if (nameHeader !== null && nameHeader !== '') {
        console.log('Found filename in "name" header');
        filename = nameHeader;
    } else if (contentHeader !== null && (result = contentHeader.match(/filename=(?:"([^"]+)"|([^;]+);?)/))) {
        console.log('Found filename in "content-disposition" header');
        filename = (typeof(result[1]) !== 'undefined' ? result[1] : result[2]);
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

torrentToWeb.notify = function(message)
{
    browser.notifications.create('notif',
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
    contexts: ['link']
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId !== 'send-to-torrent-client') {
        return;
    }

    torrentToWeb.processUrl(info.linkUrl);
});
