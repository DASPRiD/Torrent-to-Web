if (typeof torrentToWeb === 'undefined') {
    var torrentToWeb = {};
};

if (typeof torrentToWeb.adapter === 'undefined') {
    torrentToWeb.adapter = {};
};

torrentToWeb.adapter.rutorrent = function(baseUrl, username, password, autostart)
{
    baseUrl = baseUrl.replace(/^(https?:\/\/)/, '$1' + username + ':' + password + '@');

    return {
        send: function(filename, data, callback)
        {
            var formData = new FormData();

            if (!autostart) {
                formData.append('torrents_start_stopped', '1');
            }

            formData.append('torrent_file', data, filename);

            var request = new XMLHttpRequest();
            request.open('POST', baseUrl + '/php/addtorrent.php', true);
            request.onreadystatechange = function(e) {
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
