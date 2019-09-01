'use strict';

let profiles = {};

let exampleUrl = {
    deluge: 'http://your.seed.box:8112',
    flood: 'http://your.seed.box:3000',
    qbittorrent: 'http://your.seed.box:8080',
    rutorrent: 'http://your.seed.box',
    transmission: 'http://your.seed.box:9091',
};

// A minimal torrent without any trackers for testing upload functionality.
const testdata = 'ZDg6YW5ub3VuY2UxNjpodHRwOi8vbG9jYWxob3N0MTM6Y3JlYXRpb24gZGF0ZWkxNTY2NDM0ODM0'
                 + 'ZTQ6aW5mb2Q2Omxlbmd0aGkxM2U0Om5hbWUzMTpUZXN0IHVwbG9hZGVkIGJ5IFRvcnJlbnQtdG8t'
                 + 'V2ViMTI6cGllY2UgbGVuZ3RoaTE2Mzg0ZTY6cGllY2VzMjA6XjPmGK6+JxCgRs155fReXiO82g1l'
                 + 'ZQ==';

function nextId () {
    let newid = 1;

    while (true) {
        let used = false;

        for (let name in profiles) {
            let p = profiles[name];

            if (p.nid === newid) {
                used = true;
                break;
            }
        }

        if (! used) {
            return newid;
        }

        newid++;
    }
}

function appendOpt (value) {
    let list = document.querySelector('#profiles');
    let opt = document.createElement('option');
    opt.value = value;
    opt.innerText = value;
    list.appendChild(opt);
    list.value = value;
    showProfile(value);
}

function removeOpt (value) {
    let list = document.querySelector('#profiles');

    for (let i = 0; i < list.childElementCount; i++) {
        if (list[i].value === value) {
            list.removeChild(list[i]);

            if (i < list.childElementCount) {
                list.value = list[i].value;
                showProfile(list.value);
                return;
            }

            if (i > 0) {
                list.value = list[i - 1].value;
                showProfile(list.value);
                return;
            }

            clearForm();
            return;
        }
    }
}

function validateUrl () {
    let urlfield = document.querySelector('#url');
    try {
        new URL(urlfield.value);

        if (! /^https?:\/\//.test(urlfield.value)) {
            throw new Error('Invalid URL');
        }
    } catch (e) {
        urlfield.setAttribute('style', 'border-color:red;');
        return false;
    }

    urlfield.setAttribute('style', '');
    return true;
}

function urlChanged () {
    if (validateUrl()) {
        document.querySelector('#test').removeAttribute('disabled');
        return;
    }

    document.querySelector('#test').setAttribute('disabled', 'true');
}

function nameChanged () {
    let name = document.querySelector('#name').value;

    if (/^\s*$/.test(name)) {
        document.querySelector('#save').setAttribute('disabled', 'true');
        document.querySelector('#remove').setAttribute('disabled', 'true');
        return;
    }

    document.querySelector('#save').removeAttribute('disabled');

    if (profiles.hasOwnProperty(name)) {
        document.querySelector('#remove').removeAttribute('disabled');
        return;
    }

    document.querySelector('#remove').setAttribute('disabled', 'true');
}

function adapterChanged () {
    let adapter = document.querySelector('#adapter').value;
    document.querySelector('#url').placeholder = exampleUrl[adapter];

    if (adapter === 'deluge') {
        document.querySelector('#username').setAttribute('disabled', 'true');
        return;
    }

    document.querySelector('#username').removeAttribute('disabled');
}

function clearForm () {
    document.querySelector('#name').value = '';
    document.querySelector('#url').value = '';
    document.querySelector('#username').value = '';
    document.querySelector('#password').value = '';
    document.querySelector('#magnet').checked = false;
    document.querySelector('#autostart').checked = false;
    nameChanged();
}

function showProfile (name) {
    let profile = profiles[name];
    let oldName = document.querySelector('#name').value;
    let oldAdapter = document.querySelector('#adapter').value;
    let oldUrl = document.querySelector('#url').value;
    document.querySelector('#name').value = name;
    document.querySelector('#adapter').value = profile.adapter || 'rutorrent';
    document.querySelector('#url').value = profile.url || '';
    document.querySelector('#username').value = profile.username || '';
    document.querySelector('#password').value = profile.password || '';
    document.querySelector('#magnet').checked = profile.magnet || false;
    document.querySelector('#autostart').checked = profile.autostart || false;

    if (name != oldName) {
        nameChanged();
    }

    if (profile.adapter != oldAdapter) {
        adapterChanged();
    }

    if (profile.url != oldUrl) {
        urlChanged();
    }
}

function saveOptions (event) {
    event.preventDefault();

    if (! validateUrl()) {
        return;
    }

    let name = document.querySelector('#name').value;
    let already = profiles.hasOwnProperty(name);
    profiles[name] = {
        nid: already ? profiles[name].nid : nextId(),
        adapter: document.querySelector('#adapter').value,
        url: document.querySelector('#url').value,
        username: document.querySelector('#username').value,
        password: document.querySelector('#password').value,
        magnet: document.querySelector('#magnet').checked,
        autostart: document.querySelector('#autostart').checked,
    };
    browser.storage.local.set(profiles).then(() => {
        if (! already) {
            appendOpt(name);
        }

        nameChanged();
    }, (error) => {
        console.log(error);
    });
}

function restoreOptions () {
    browser.storage.local.get().then((storage) => {
        profiles = storage;

        for (let name in profiles) {
            appendOpt(name);
        }
    }, (error) => {
        console.log(error);
    });
}

function removeProfile (event) {
    event.preventDefault();
    let name = document.querySelector('#name').value;
    delete profiles[name];
    removeOpt(name);
    browser.storage.local.remove(name).catch((error) => {
        console.log(error);
    });
}

function testProfile (event) {
    event.preventDefault();
    fetch('data:application/octet-stream;base64,' + testdata).then((resp) => {
        resp.blob().then((blob) => {
            let msg = {
                test: {
                    adapter: document.querySelector('#adapter').value,
                    url: document.querySelector('#url').value,
                    username: document.querySelector('#username').value,
                    password: document.querySelector('#password').value,
                    autostart: document.querySelector('#autostart').checked,
                    data: blob,
                },
            };
            browser.runtime.sendMessage(msg);
        });
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);
document.querySelector('#remove').addEventListener('click', removeProfile);
document.querySelector('#test').addEventListener('click', testProfile);
document.querySelector('#name').addEventListener('input', nameChanged);
document.querySelector('#adapter').addEventListener('change', adapterChanged);
document.querySelector('#url').addEventListener('input', urlChanged);
document.querySelector('.vtoggle').addEventListener('click', function () {
    this.innerText = (this.innerText === 'Show') ? 'Hide' : 'Show';
    let pwfield = document.querySelector('#password');
    pwfield.type = (pwfield.type === 'password') ? 'text' : 'password';
});

document.querySelector('#profiles').addEventListener('change', function (event) {
    showProfile(event.target.value);
});

nameChanged();
adapterChanged();
