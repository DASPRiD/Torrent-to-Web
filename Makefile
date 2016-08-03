all: clean torrent-to-web.xpi

torrent-to-web.xpi:
	zip -r torrent-to-web.xpi background icons LICENSE manifest.json options

clean:
	rm torrent-to-web.xpi

