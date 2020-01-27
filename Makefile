all: webpack build

webpack:
	webpack

build:
	go build -i -o ./dist/simple-json-plugin_linux_amd64 ./backend
