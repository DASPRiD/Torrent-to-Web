'use strict';

torrentToWeb.adapter.rutorrent = function (baseUrl, username, password, autostart) {
    let baseUrlObject = new URL(baseUrl);
    baseUrlObject.username = username;
    baseUrlObject.password = password;

    baseUrl = baseUrlObject.toString();

    return {
        send: function (filenameOrUrl, data, callback) {
            let formData = new FormData();

            if (! autostart) {
                formData.append('torrents_start_stopped', '1');
            }

            if (filenameOrUrl.startsWith('magnet:')) {
                formData.append('url', filenameOrUrl);
            } else {
                formData.append('torrent_file', data, filenameOrUrl);
            }

            let request = new XMLHttpRequest();
            request.open('POST', baseUrl + '/php/addtorrent.php', true);
            request.onreadystatechange = function () {
                if (request.readyState !== XMLHttpRequest.DONE) {
                    return;
                }

                if (request.status !== 200) {
                    callback(false);
                    return;
                }

                callback(true);
            };

            request.send(formData);
        }
    };
};
