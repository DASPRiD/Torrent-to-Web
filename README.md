# Torrent to Web Add-on for Firefox

[![CI](https://github.com/DASPRiD/Torrent-to-Web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/DASPRiD/Torrent-to-Web/actions/workflows/ci.yml)

An add-on which allows sending torrent files to web clients.

The Add-on currently supports the following clients:

- Deluge
- Flood
- qBittorrent
- ruTorrent
- Transmission/Vuze/Azureus

## Development

1. Install dependencies:
    ```bash
    pnpm install
    ```

2. Start a continuous build with a hot-reloading instance of Firefox:
    ```bash
    pnpm start
    ```

## Build

To build the extension, run `pnpm build`. To package it, run `pnpm zip`, the resulting zip file can then be found
in the `.output` directory.
