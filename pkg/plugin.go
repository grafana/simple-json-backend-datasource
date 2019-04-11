package main

import (
	"os"

	"log"

	"github.com/grafana/grafana_plugin_model/go/datasource"
	plugin "github.com/hashicorp/go-plugin"
)

func main() {
	// The plugin should sends logs to the Stderr
	log.SetOutput(os.Stderr)
	log.Println("Running Simple JSON backend datasource")

	plugin.Serve(&plugin.ServeConfig{

		HandshakeConfig: plugin.HandshakeConfig{
			ProtocolVersion:  1,
			MagicCookieKey:   "grafana_plugin_type",
			MagicCookieValue: "datasource",
		},
		Plugins: map[string]plugin.Plugin{
			"simple-json-backend-datasource": &datasource.DatasourcePluginImpl{Plugin: &JsonDatasource{}},
		},

		// A non-nil value here enables gRPC serving for this plugin...
		GRPCServer: plugin.DefaultGRPCServer,
	})
}
