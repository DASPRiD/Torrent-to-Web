'use strict';

/**
 * This file was taken from https://github.com/themasch/node-bencode/blob/master/lib/decode.js
 * and ported to use native UInt8Array/ArrayBuffer in order to get rid of node dependencies.
 * Original license: MIT
 */

/**
 * Decodes bencoded data like torrent files.
 *
 * @param  {ArrayBuffer} data
 * @return {Object|Array|Buffer|String|Number}
 */
function decode (data) {
    if (data == null || data.length === 0) {
        return null;
    }

    decode.position = 0;
    decode.data = new Uint8Array(data);
    decode.bytes = decode.data.length;
    return decode.next();
}

decode.bytes = 0;
decode.position = 0;
decode.data = null;

const INTEGER_START = 0x69; // 'i'
const STRING_DELIM = 0x3A; // ':'
const DICTIONARY_START = 0x64; // 'd'
const LIST_START = 0x6C; // 'l'
const END_OF_TYPE = 0x65; // 'e'

decode.getIntFromBuffer = function (data, start, end) {
    let sum = 0;
    let sign = 1;

    for (let i = start; i < end; i++) {
        let num = data[i];

        if (num < 58 && num >= 48) {
            sum = sum * 10 + (num - 48);
            continue;
        }

        if (i === start && num === 43) { // +
            continue;
        }

        if (i === start && num === 45) { // -
            sign = - 1;
            continue;
        }

        if (num === 46) { // .
            // its a float. break here.
            break;
        }

        throw new Error('not a number: data[' + i + '] = ' + num);
    }

    return sum * sign;
};

decode.next = function () {
    switch (decode.data[decode.position]) {
        case DICTIONARY_START:
            return decode.dictionary();
        case LIST_START:
            return decode.list();
        case INTEGER_START:
            return decode.integer();
        default:
            return decode.buffer();
    }
};

decode.find = function (chr) {
    let i = decode.position;
    const c = decode.data.length;
    const d = decode.data;

    while (i < c) {
        if (d[i] === chr) {
            return i;
        }

        i++;
    }

    throw new Error(
        'Invalid data: Missing delimiter "'
        + String.fromCharCode(chr)
        + '" [0x' + chr.toString(16) + ']'
    );
};

decode.dictionary = function () {
    decode.position++;

    let dict = {};

    while (decode.data[decode.position] !== END_OF_TYPE) {
        dict[decode.buffer()] = decode.next();
    }

    decode.position++;

    return dict;
};

decode.list = function () {
    decode.position++;

    let lst = [];

    while (decode.data[decode.position] !== END_OF_TYPE) {
        lst.push(decode.next());
    }

    decode.position++;

    return lst;
};

decode.integer = function () {
    const end = decode.find(END_OF_TYPE);
    const number = decode.getIntFromBuffer(decode.data, decode.position + 1, end);

    decode.position += end + 1 - decode.position;

    return number;
};

decode.toString = function (array) {
    const len = array.length;
    let out = '';
    let i = 0;
    let c;
    let char2;
    let char3;

    while (i < len) {
        c = array[i++];
        switch (c >> 4) {
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:

                // 0xxxxxxx
                out += String.fromCharCode(c);
            break;
            case 12: case 13:

                // 110x xxxx   10xx xxxx
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
            case 14:

                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12)
                                           | ((char2 & 0x3F) << 6)
                                           | ((char3 & 0x3F) << 0));
            break;
        }
    }

    return out;
};

decode.buffer = function () {
    let sep = decode.find(STRING_DELIM);
    const length = decode.getIntFromBuffer(decode.data, decode.position, sep);
    const end = ++ sep + length;
    decode.position = end;
    return decode.toString(decode.data.slice(sep, end));
};
