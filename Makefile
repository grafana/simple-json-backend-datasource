all: webpack build
deps: deps-front deps-back

webpack:
	webpack --config=./webpack/webpack.dev.conf.js

build:
	go build -i -o ./dist/simple-json-plugin_linux_amd64 ./backend

deps-front:
	yarn install --pure-lockfile

deps-back:
	dep ensure
