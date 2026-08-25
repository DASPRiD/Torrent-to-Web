type BencodeItem = string | number | BencodeItem[] | { [key: string]: BencodeItem };

class Decoder {
    private readonly data: Uint8Array;
    private position = 0;

    private readonly integerStart = 0x69;
    private readonly stringDelimiter = 0x3a;
    private readonly dictionaryStart = 0x64;
    private readonly listStart = 0x6c;
    private readonly endOfType = 0x65;

    public constructor(data: Uint8Array) {
        this.data = data;
    }

    public decode(): BencodeItem {
        return this.next();
    }

    private next(): BencodeItem {
        switch (this.data[this.position]) {
            case this.dictionaryStart:
                return this.dictionary();

            case this.listStart:
                return this.list();

            case this.integerStart:
                return this.integer();

            default:
                return this.buffer();
        }
    }

    private dictionary(): Record<string, BencodeItem> {
        ++this.position;
        const dictionary: Record<string, BencodeItem> = {};

        while (this.data[this.position] !== this.endOfType) {
            dictionary[this.buffer()] = this.next();
        }

        ++this.position;
        return dictionary;
    }

    private list(): BencodeItem[] {
        ++this.position;
        const list: BencodeItem[] = [];

        while (this.data[this.position] !== this.endOfType) {
            list.push(this.next());
        }

        ++this.position;
        return list;
    }

    private integer(): number {
        const end = this.find(this.endOfType);
        const number = this.getInt(this.position + 1, end);
        this.position += end + 1 - this.position;
        return number;
    }

    private buffer(): string {
        let separatorPosition = this.find(this.stringDelimiter);
        const length = this.getInt(this.position, separatorPosition);
        const end = ++separatorPosition + length;
        this.position = end;

        return this.toString(this.data.slice(separatorPosition, end));
    }

    private find(character: number): number {
        let position = this.position;

        while (position < this.data.length) {
            if (this.data[position] === character) {
                return position;
            }

            ++position;
        }

        throw new Error(
            `Invalid data: Missing delimiter "${String.fromCharCode(character)}" [0x${character.toString(16)}]`,
        );
    }

    private toString(data: Uint8Array): string {
        let result = "";
        let position = 0;

        // A missing continuation byte reads as undefined, and `undefined & 0x3f` is 0, so a
        // truncated sequence would otherwise decode to a plausible but wrong character instead
        // of failing.
        const nextByte = (): number => {
            const byte = data[position++];

            if (byte === undefined) {
                throw new Error("Invalid data: Truncated UTF-8 sequence");
            }

            return byte;
        };

        while (position < data.length) {
            const character = nextByte();

            switch (character >> 4) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    result += String.fromCharCode(character);
                    break;

                case 12:
                case 13:
                    result += String.fromCharCode(((character & 0x1f) << 6) | (nextByte() & 0x3f));
                    break;

                case 14:
                    result += String.fromCharCode(
                        ((character & 0x0f) << 12) |
                            ((nextByte() & 0x3f) << 6) |
                            ((nextByte() & 0x3f) << 0),
                    );
                    break;

                // Four byte sequences carry everything outside the basic plane, so this needs
                // fromCodePoint rather than fromCharCode. Lead bytes of 0x80 to 0xbf still fall
                // through and are skipped, because torrent names are not reliably utf-8 and
                // rejecting them outright would fail uploads that currently succeed.
                //
                // Binary fields such as the piece hashes flow through here as well, so invalid
                // lead bytes (above 0xf4), sequences cut off by the end of the buffer, and code
                // points beyond the Unicode range are skipped in the same way rather than thrown
                // on, which fromCodePoint would otherwise do.
                case 15: {
                    if (character > 0xf4) {
                        break;
                    }

                    if (position + 3 > data.length) {
                        position = data.length;
                        break;
                    }

                    const codePoint =
                        ((character & 0x07) << 18) |
                        ((nextByte() & 0x3f) << 12) |
                        ((nextByte() & 0x3f) << 6) |
                        (nextByte() & 0x3f);

                    if (codePoint <= 0x10ffff) {
                        result += String.fromCodePoint(codePoint);
                    }

                    break;
                }
            }
        }

        return result;
    }

    private getInt(start: number, end: number): number {
        let sum = 0;
        let sign = 1;

        for (let i = start; i < end; ++i) {
            const num = this.data[i];

            if (num === undefined) {
                throw new Error(`Invalid data: Unexpected end of input at index ${i}`);
            }

            if (num < 58 && num >= 48) {
                sum = sum * 10 + (num - 48);
                continue;
            }

            if (i === start && num === 43) {
                // Positive
                continue;
            }

            if (i === start && num === 45) {
                // Negative
                sign = -1;
                continue;
            }

            if (num === 46) {
                // Floating point number.
                break;
            }

            throw new Error(`Not a number: array[${i}] = ${num}`);
        }

        return sum * sign;
    }
}

export const decode = (data: Uint8Array): BencodeItem => {
    return new Decoder(data).decode();
};
