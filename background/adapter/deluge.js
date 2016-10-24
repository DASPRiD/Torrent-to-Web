if (typeof torrentToWeb === 'undefined') {
    var torrentToWeb = {};
};

if (typeof torrentToWeb.adapter === 'undefined') {
    torrentToWeb.adapter = {};
};

torrentToWeb.adapter.deluge = function(baseUrl, username, password, autostart)
{
    var baseUrlObject = new URL(baseUrl);
    baseUrlObject.username = username;
    baseUrlObject.password = password;
    baseUrlObject.pathname = '/json';
    baseUrlObject.search = '';
    baseUrlObject.hash = '';

    baseUrl = baseUrlObject.toString();

    return {
        send: function(filename, data, callback)
        {
            var fileReader = new FileReader();
            fileReader.addEventListener('load', function(){
                var requestData = {
                    'id': '2',
                    'method': 'core.add_torrent_file',
                    'params': [filename,window.btoa(fileReader.result), null]
                };

                sendRequest(requestData, callback, null);
            });
            fileReader.readAsBinaryString(data);
        }
    };

    function sendRequest(requestData, callback, delugeSessionId){
        var request = new XMLHttpRequest();
        request.open('POST', baseUrl, true);
        request.setRequestHeader('Content-Type', 'json');
        request.setRequestHeader('_session_id', delugeSessionId);

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
        request.send(JSON.stringify(requestData));
    };
};
