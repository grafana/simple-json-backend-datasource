package main

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	simplejson "github.com/bitly/go-simplejson"
	"github.com/grafana/grafana_plugin_model/go/datasource"
	plugin "github.com/hashicorp/go-plugin"
	"golang.org/x/net/context"
	"golang.org/x/net/context/ctxhttp"
)

type JsonDatasource struct {
	plugin.NetRPCUnsupportedPlugin
}

func (ds *JsonDatasource) Query(ctx context.Context, tsdbReq *datasource.DatasourceRequest) (*datasource.DatasourceResponse, error) {
	log.Println("from plugins!")

	ds_response := &datasource.DatasourceResponse{}

	request, err := ds.createRequest(tsdbReq)
	log.Printf("%s %s", request.Method, request.URL.String())
	if err != nil {
		return nil, err
	}

	response, err := ctxhttp.Do(ctx, httpClient, request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Request failed. Status: %v", response.Status)
	}

	body, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	r, err := parseResponse(body, "A")
	if err != nil {
		return nil, err
	}

	ds_response.Results = append(ds_response.Results, r)

	return ds_response, nil
}

func (ds *JsonDatasource) createRequest(tsdbReq *datasource.DatasourceRequest) (*http.Request, error) {
	log.Println(tsdbReq.String())
	payload := simplejson.New()
	payload.SetPath([]string{"range", "to"}, tsdbReq.TimeRange.ToRaw)
	payload.SetPath([]string{"range", "from"}, tsdbReq.TimeRange.FromRaw)

	qs := []interface{}{}
	for _, query := range tsdbReq.Queries {
		json, err := simplejson.NewJson([]byte(query.ModelJson))
		if err != nil {
			return nil, err
		}

		qs = append(qs, json)
	}
	payload.Set("targets", qs)

	rbody, err := payload.MarshalJSON()
	if err != nil {
		return nil, err
	}

	url := tsdbReq.Datasource.Url + "/query"
	req, err := http.NewRequest(http.MethodPost, url, strings.NewReader(string(rbody)))
	if err != nil {
		return nil, err
	}

	req.Header.Add("Content-Type", "application/json")

	return req, nil
}

func parseResponse(body []byte, refId string) (*datasource.QueryResult, error) {
	responseBody := []TargetResponseDTO{}
	err := json.Unmarshal(body, &responseBody)
	if err != nil {
		return nil, err
	}

	series := []*datasource.TimeSeries{}
	for _, r := range responseBody {
		serie := &datasource.TimeSeries{Name: r.Target}

		for _, p := range r.DataPoints {
			serie.Points = append(serie.Points, &datasource.Point{
				Timestamp: int64(p[1]),
				Value:     p[0],
			})
		}

		series = append(series, serie)
	}

	return &datasource.QueryResult{
		Series: series,
		RefId:  refId,
	}, nil
}

var httpClient = &http.Client{
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{
			Renegotiation: tls.RenegotiateFreelyAsClient,
		},
		Proxy: http.ProxyFromEnvironment,
		Dial: (&net.Dialer{
			Timeout:   30 * time.Second,
			KeepAlive: 30 * time.Second,
			DualStack: true,
		}).Dial,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
	},
	Timeout: time.Duration(time.Second * 30),
}
