# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://www.conventionalcommits.org/) for commit guidelines.

## [2.1.1](https://github.com/DASPRiD/Torrent-to-Web/compare/torrent-to-web-v2.1.0...torrent-to-web-v2.1.1) (2026-09-27)


### Bug Fixes

* **bencode:** return byte strings as raw bytes ([e668d0a](https://github.com/DASPRiD/Torrent-to-Web/commit/e668d0ae03ecc07125c5964e3381c97a9fca266b))
* read the name.utf-8 key that torrents actually use ([25be5c1](https://github.com/DASPRiD/Torrent-to-Web/commit/25be5c1a35b3fd071a87f09eebe5ff20b5ac3933))

## [2.1.0](https://github.com/DASPRiD/Torrent-to-Web/compare/torrent-to-web-v2.0.2...torrent-to-web-v2.1.0) (2026-09-24)


### Features

* add flood client ([16baa16](https://github.com/DASPRiD/Torrent-to-Web/commit/16baa164d676e86989666cabfd2303bc6504bd94))


### Bug Fixes

* **bencode:** decode four byte utf-8 sequences ([daecd4e](https://github.com/DASPRiD/Torrent-to-Web/commit/daecd4e134d383f20f0a19499ae85f942fef9296))
* **client:** transform URLs to URL patterns for request introspection ([cf1aca3](https://github.com/DASPRiD/Torrent-to-Web/commit/cf1aca3d786219fbbdf20515fb8ac5e7e59cd35a)), closes [#46](https://github.com/DASPRiD/Torrent-to-Web/issues/46)
* migrate legacy profiles from storage entries rather than keys ([2ac247d](https://github.com/DASPRiD/Torrent-to-Web/commit/2ac247dafef597d0460045278c3ed6367191cc16))
* only swallow magnet clicks when a profile handles them ([3e0584d](https://github.com/DASPRiD/Torrent-to-Web/commit/3e0584d771abe4bfc2c198dc43d50c4f31766074))
* **options:** correctly link autostart label to checkbox ([dfa7014](https://github.com/DASPRiD/Torrent-to-Web/commit/dfa70148b2f95ef15f3261908163baeee80fc0e9))
* **options:** keep the form in step with the selected profile ([99552a5](https://github.com/DASPRiD/Torrent-to-Web/commit/99552a5330fa6cd83a47d540d07f79ebcc80178f))
* **options:** toggle username disabled flag when changing client ([83bd519](https://github.com/DASPRiD/Torrent-to-Web/commit/83bd519e3ff817d3b15117654c14b343aa593fd5))
* **qbittorrent:** build spoof patterns the same way as the requests ([42a6bfc](https://github.com/DASPRiD/Torrent-to-Web/commit/42a6bfc4c26ca2c0119d57bb881a49bd75de79d3))
* remove trailing slash from URLs before concatinating ([07f963a](https://github.com/DASPRiD/Torrent-to-Web/commit/07f963a3a73ba621c31d6a04bde9d7ea478d6d84))
* serialise context menu rebuilds ([392fb0f](https://github.com/DASPRiD/Torrent-to-Web/commit/392fb0f42e723051c45191e223fef400abcb359b))

### [2.0.2](https://github.com/DASPRiD/Torrent-to-Web/compare/v2.0.1...v2.0.2) (2022-03-12)


### Bug Fixes

* **client:** transform URLs to URL patterns for request introspection ([cf1aca3](https://github.com/DASPRiD/Torrent-to-Web/commit/cf1aca3d786219fbbdf20515fb8ac5e7e59cd35a)), closes [#46](https://github.com/DASPRiD/Torrent-to-Web/issues/46)
* remove trailing slash from URLs before concatinating ([07f963a](https://github.com/DASPRiD/Torrent-to-Web/commit/07f963a3a73ba621c31d6a04bde9d7ea478d6d84))

### [2.0.1](https://github.com/DASPRiD/Torrent-to-Web/compare/v2.0.0...v2.0.1) (2022-03-10)


### Bug Fixes

* **options:** correctly link autostart label to checkbox ([dfa7014](https://github.com/DASPRiD/Torrent-to-Web/commit/dfa70148b2f95ef15f3261908163baeee80fc0e9))

## 2.0.0 (2022-03-10)


### Bug Fixes

* **options:** toggle username disabled flag when changing client ([83bd519](https://github.com/DASPRiD/Torrent-to-Web/commit/83bd519e3ff817d3b15117654c14b343aa593fd5))
