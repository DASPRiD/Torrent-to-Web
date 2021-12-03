import {browser} from 'webextension-polyfill-ts';
import type {WebRequest} from 'webextension-polyfill-ts';

export const fetchExtractCookies = async (request : Request) : Promise<[Response, string]> => {
    let cookies = '';

    const extractCookies = (details : WebRequest.OnHeadersReceivedDetailsType) => {
        if (!details.responseHeaders) {
            return;
        }

        cookies = details.responseHeaders
            .filter(header => header.name.toLowerCase() === 'set-cookie' && Boolean(header.value))
            .map(header => (header.value as string).split(';')[0])
            .join('; ');
    };

    browser.webRequest.onHeadersReceived.addListener(
        extractCookies,
        {urls: [request.url]},
        ['blocking', 'responseHeaders'],
    );

    try {
        const response = await fetch(new Request(request, {credentials: 'omit'}));
        return [response, cookies];
    } finally {
        browser.webRequest.onHeadersReceived.removeListener(extractCookies);
    }
};

export const fetchWithCookies = async (request : Request, cookies : string) : Promise<Response> => {
    const injectCookies = (details : WebRequest.OnBeforeSendHeadersDetailsType) => {
        const headers = (details.requestHeaders ?? []).filter(header => header.name.toLowerCase() !== 'cookie');
        headers.push({name: 'cookie', value: cookies});
        return {requestHeaders: headers};
    };

    browser.webRequest.onBeforeSendHeaders.addListener(
        injectCookies,
        {urls: [request.url]},
        ['blocking', 'requestHeaders'],
    );

    try {
        return await fetch(new Request(request, {credentials: 'omit'}));
    } finally {
        browser.webRequest.onBeforeSendHeaders.removeListener(injectCookies);
    }
};

export const spoofOrigin = async <T>(runner : () => Promise<T>, urls : string[], origin : string) : Promise<T> => {
    const spoofHeaders = (details : WebRequest.OnBeforeSendHeadersDetailsType) => {
        const headers = (details.requestHeaders ?? [])
            .filter(header => !['origin', 'referer'].includes(header.name.toLowerCase()));

        headers.push({name: 'origin', value: origin});
        headers.push({name: 'referer', value: origin});

        return {requestHeaders: headers};
    };

    browser.webRequest.onBeforeSendHeaders.addListener(
        spoofHeaders,
        {urls},
        ['blocking', 'requestHeaders'],
    );

    try {
        return await runner();
    } finally {
        browser.webRequest.onBeforeSendHeaders.removeListener(spoofHeaders);
    }
};
