import {browser} from 'webextension-polyfill-ts';

window.addEventListener('click', event => {
    let target = event.target as HTMLElement;

    while ((!(target instanceof HTMLAnchorElement) || !target.href) && target.parentElement) {
        target = target.parentElement;
    }

    if (!(target instanceof HTMLAnchorElement)) {
        return;
    }

    if (target.href.startsWith('magnet:')) {
        event.stopPropagation();
        event.preventDefault();

        browser.runtime.sendMessage({magnetUrl: target.href}).catch(error => {
            console.error(error);
        });
    }
});
