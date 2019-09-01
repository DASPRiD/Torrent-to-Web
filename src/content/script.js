'use strict';

function notifyBackground (e) {
    let target = e.target;
    while ((target.tagName != 'A' || ! target.href) && target.parentNode) {
        target = target.parentNode;
    }

    if (target.tagName != 'A') {
        return;
    }

    if (target.href.startsWith('magnet:')) {
        e.stopPropagation();
        e.preventDefault();
        let msg = {
            magnet: target.href,
        };
        browser.runtime.sendMessage(msg);
    }
}

window.addEventListener('click', notifyBackground);
