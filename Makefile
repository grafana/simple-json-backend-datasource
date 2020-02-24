GOARCH := $(shell go env GOARCH)
GOHOSTOS := $(shell go env GOHOSTOS)
NODEOS := $(shell echo 'process.platform === "win32" ? console.log("win") : console.log(process.platform);' | node)
ifeq (${GOHOSTOS}, windows)
EXT := .exe
else
EXT := 
endif

all: grunt build

grunt:
	grunt

build:
	go build -i -o ./dist/simple-json-plugin_${GOHOSTOS}_${GOARCH}${EXT} ./pkg

build-node:
	npx pkg -t node12-${NODEOS} ./pkg/main.js --output ./dist/simple-json-plugin_${GOHOSTOS}_${GOARCH}${EXT}
