'use strict';

torrentToWeb.adapter.deluge = function (baseUrl, username, password, autostart) {
    let baseUrlObject = new URL(baseUrl);
    baseUrlObject.pathname = '/json';

    baseUrl = baseUrlObject.toString();

    function login (callback) {
        let request = new XMLHttpRequest();
        request.open('POST', baseUrl, true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.onreadystatechange = function () {
            if (request.readyState !== XMLHttpRequest.DONE) {
                return;
            }

            if (request.status !== 200) {
                return;
            }

            callback();
        };

        request.send(JSON.stringify({
            id: '1',
            method: 'auth.login',
            params: [password],
        }));
    }

    return {
        send: function (filenameOrUrl, data, callback) {
            let options = {};

            if (! autostart) {
                options['add_paused'] = true;
            }

            if (filenameOrUrl.startsWith('magnet:')) {
                let requestData = {
                    id: '2',
                    method: 'core.add_torrent_magnet',
                    params: [filenameOrUrl, options],
                };

                login(() => {
                    sendRequest(requestData, callback, null);
                });
            } else {
                let fileReader = new FileReader();

                fileReader.addEventListener('load', function () {
                    let requestData = {
                        id: '2',
                        method: 'core.add_torrent_file',
                        params: [filenameOrUrl, window.btoa(fileReader.result), options],
                    };

                    login(() => {
                        sendRequest(requestData, callback, null);
                    });
                });

                fileReader.readAsBinaryString(data);
            }
        }
    };

    function sendRequest (requestData, callback) {
        let request = new XMLHttpRequest();
        request.open('POST', baseUrl, true);
        request.setRequestHeader('Content-Type', 'application/json');
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

        request.send(JSON.stringify(requestData));
    };
};
