function saveOptions(e) {
    chrome.storage.local.set({
        adapter: document.querySelector('#adapter').value,
        url: document.querySelector('#url').value,
        username: document.querySelector('#username').value,
        password: document.querySelector('#password').value,
        autostart: document.querySelector('#autostart').checked
    });
}

function restoreOptions() {
    chrome.storage.local.get(function(result) {
        document.querySelector("#adapter").value = result.adapter || 'rutorrent';
        document.querySelector("#url").value = result.url || '';
        document.querySelector("#username").value = result.username || '';
        document.querySelector("#password").value = result.password || '';
        document.querySelector("#autostart").checked = result.autostart || false;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);

