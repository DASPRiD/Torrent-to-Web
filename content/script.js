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
        browser.runtime.sendMessage(target.href);
    }
}

window.addEventListener('click', notifyBackground);
