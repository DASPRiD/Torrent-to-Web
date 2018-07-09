if (typeof torrentToWeb === 'undefined') {
    var torrentToWeb = {};
};

if (typeof torrentToWeb.adapter === 'undefined') {
    torrentToWeb.adapter = {};
};

torrentToWeb.adapter.deluge = function(baseUrl, username, password)
{
    var baseUrlObject = new URL(baseUrl);
    baseUrlObject.pathname = '/json';

    baseUrl = baseUrlObject.toString();

    function getSessionID() {
        var request = new XMLHttpRequest();
            request.open( "POST", baseUrl, true);
            request.setRequestHeader("Content-Type", "application/json");

            request.send(
		    JSON.stringify({
			'id': '1',
			'method': 'auth.login',
			'params': [password]
		    })
	    );
    }

    return {
        send: function(filename, data, callback)
        {
            var fileReader = new FileReader();
            fileReader.addEventListener('load', function(){
                var requestData = {
                    'id': '2',
                    'method': 'core.add_torrent_file',
                    'params': [filename, window.btoa(fileReader.result), null]
                };

                sendRequest(requestData, callback, null);
            });
            fileReader.readAsBinaryString(data);
        }
    };

    function sendRequest(requestData, callback){
        getSessionID();
        var request = new XMLHttpRequest();
        request.open('POST', baseUrl, true);
        request.setRequestHeader("Content-Type", "application/json");
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
