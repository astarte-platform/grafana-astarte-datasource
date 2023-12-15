package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/astarte-platform/astarte-go/client"
	"github.com/astarte-platform/astarte-go/interfaces"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// Make sure SampleDatasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler, backend.StreamHandler interfaces. Plugin should not
// implement all these interfaces - only those which are required for a particular task.
// For example if plugin does not need streaming functionality then you are free to remove
// methods that implement backend.StreamHandler. Implementing instancemgmt.InstanceDisposer
// is useful to clean up resources used by previous datasource instance when a new datasource
// instance created upon datasource settings changed.
var (
	_ backend.QueryDataHandler    = (*AppEngineDatasource)(nil)
	_ backend.CheckHealthHandler  = (*AppEngineDatasource)(nil)
	_ backend.CallResourceHandler = (*AppEngineDatasource)(nil)
	// We're not interested in streaming
	// _ backend.StreamHandler         = (*SampleDatasource)(nil)
	_ instancemgmt.InstanceDisposer = (*AppEngineDatasource)(nil)
)

type appEngineDataSourceSourceSettings struct {
	ApiUrl string `json:"apiUrl"`
	Realm  string `json:"realm"`
	Token  string `json:"token"`
}

func newAppEngineDatasourceSettings(instanceSettings backend.DataSourceInstanceSettings) (appEngineDataSourceSourceSettings, error) {
	var settings appEngineDataSourceSourceSettings
	if err := json.Unmarshal(instanceSettings.JSONData, &settings); err != nil {
		return appEngineDataSourceSourceSettings{}, err
	}
	return settings, nil
}

// NewAppEngineDatasource creates a new datasource instance.
func NewAppEngineDatasource(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	log.DefaultLogger.Info("NewAppEngineDatasource called with", "backend_settings", settings)

	datasource := &AppEngineDatasource{}
	dsSettings, err := newAppEngineDatasourceSettings(settings)
	if err != nil {
		log.DefaultLogger.Error("Cannot read settings", "error", err)
		return nil, err
	}

	// If localhost is used, one must hardcode AppEngine, Realm Management URLs and no SSL
	astarteAPIClient, err := client.New(
		client.WithBaseURL(dsSettings.ApiUrl),
		client.WithJWT(dsSettings.Token),
	)
	if err != nil {
		log.DefaultLogger.Error("Cannot setup API client: ", "error", err)
		return nil, err
	}

	log.DefaultLogger.Info("Starting with settings:", "realm", dsSettings.Realm, "token", dsSettings.Token, "apiUrl", dsSettings.ApiUrl)

	datasource.astarteAPIClient = astarteAPIClient
	datasource.realm = dsSettings.Realm
	return datasource, nil
}

// AppEngineDatasource is a datasource which can respond to data queries and reports its health.
type AppEngineDatasource struct {
	astarteAPIClient *client.Client
	realm            string
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewAppEngineDatasource factory function.
func (d *AppEngineDatasource) Dispose() {
	// Delete the client (the one with AppEngine address and token)
	log.DefaultLogger.Info("Disposing of", "appengine_datasource", d)
	// Clean up datasource instance resources.
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *AppEngineDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	log.DefaultLogger.Debug("QueryData called", "request", req)

	// create response struct
	response := backend.NewQueryDataResponse()

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res
	}

	log.DefaultLogger.Debug("QueryData response", "response", response)
	return response, nil
}

type queryModel struct {
	Device        string `json:"device"`
	InterfaceName string `json:"interfaceName"`
	Path          string `json:"path"`
}

func (d *AppEngineDatasource) query(_ context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	response := backend.DataResponse{}

	// Unmarshal the JSON into our queryModel.
	var qm queryModel
	response.Error = json.Unmarshal(query.JSON, &qm)
	if response.Error != nil {
		log.DefaultLogger.Error("Error in query model unmarshal", "error", response.Error)
		return response
	}

	// create data frame response.
	frame := data.NewFrame("response")

	// Assuming only individually aggregated interfaces are supported
	paginator, err := d.astarteAPIClient.GetIndividualDatastreamsTimeWindowPaginator(d.realm, qm.Device, client.AstarteDeviceID, qm.InterfaceName,
		qm.Path, query.TimeRange.From, query.TimeRange.To, client.AscendingOrder, 100)

	if err != nil {
		response.Error = err
		return response
	}

	timestamps := []time.Time{}
	values := []float64{}

	for ok := true; ok; ok = paginator.HasNextPage() {
		getNextPageCall, err := paginator.GetNextPage()
		if err != nil {
			log.DefaultLogger.Error("Error building next page", "error", err)
			response.Error = err
			return response
		}

		getNextPageRes, err := getNextPageCall.Run(d.astarteAPIClient)
		if err != nil {
			log.DefaultLogger.Error("Error retrieving next page", "error", err)
			response.Error = err
			return response
		}
		page, err := getNextPageRes.Parse()
		if err != nil {
			log.DefaultLogger.Error("Error parsing Astarte page data", "error", err)
			response.Error = err
			return response
		}

		// Again assuming only individually aggregated interfaces are supported
		data, ok := page.([]client.DatastreamIndividualValue)
		if !ok {
			response.Error = fmt.Errorf("Could not find individual datastream values for device %s on interface %s, path %s", qm.Device, qm.InterfaceName, qm.Path)
			log.DefaultLogger.Error("Error on value type read", "error", response.Error)
			return response
		}

		log.DefaultLogger.Debug("Start reading Astarte data")

		for _, v := range data {
			switch v.Value.(type) {
			case float64:
				timestamps = append(timestamps, v.Timestamp)
				values = append(values, v.Value.(float64))
			case int64:
				timestamps = append(timestamps, v.Timestamp)
				values = append(values, float64(v.Value.(int64)))
			case string:
				if f, err := strconv.ParseFloat(v.Value.(string), 64); err != nil {
					log.DefaultLogger.Warn("Could not parse as numeric datatype", "value", v.Value, "error", err)
				} else {
					timestamps = append(timestamps, v.Timestamp)
					values = append(values, f)
				}
			default:
				response.Error = fmt.Errorf("Device %s has data of non-numeric type on interface %s, path %s", qm.Device, qm.InterfaceName, qm.Path)
				log.DefaultLogger.Error("Error on value type read", "error", response.Error)
				return response
			}
		}
	}

	log.DefaultLogger.Debug("Successful Astarte data read")

	TimeField := data.NewField("Time", nil, timestamps)
	ValueField := data.NewField("Value", nil, values)
	frame.Fields = append(frame.Fields, TimeField, ValueField)
	response.Frames = append(response.Frames, frame)
	return response
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *AppEngineDatasource) CheckHealth(_ context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	log.DefaultLogger.Debug("CheckHealth called", "request", req)

	// Run an actual query to Astarte, so that our JWT is checked, too
	deviceStatsCall, _ := d.astarteAPIClient.GetDevicesStats(d.realm)

	log.DefaultLogger.Debug("stats request", "curl", deviceStatsCall.ToCurl(d.astarteAPIClient))

	_, err := deviceStatsCall.Run(d.astarteAPIClient)
	if err != nil {
		log.DefaultLogger.Error("CheckHealth error", "err", err)

		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: err.Error(),
		}, err
	}

	log.DefaultLogger.Debug("CheckHealth response")

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}

func (d *AppEngineDatasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	log.DefaultLogger.Debug("CallResource  called", "request", req)

	u, _ := url.Parse(req.URL)
	params, _ := url.ParseQuery(u.RawQuery)

	if params["device_id"] != nil {
		// if device_id is provided, we've been asked for device introspection
		interfaces, err := d.getDeviceIntrospection(params["device_id"][0])
		if err != nil {
			sendBadRequest(err, sender)
		}
		body, _ := json.Marshal(interfaces)
		return sendResult(body, sender)
	} else if params["name"] != nil && params["major"] != nil {
		// we assume a valid int is always passed as interface major value
		major, _ := strconv.Atoi(params["major"][0])
		iface, err := d.getInterface(params["name"][0], major)
		if err != nil {
			sendBadRequest(err, sender)
		}
		body, _ := json.Marshal(iface)
		return sendResult(body, sender)
	} else {
		// don't know what else could we provide
		return sendBadRequest(fmt.Errorf("unexpected request"), sender)
	}
}

func (d *AppEngineDatasource) getInterface(interfaceName string, interfaceMajor int) (interfaces.AstarteInterface, error) {
	getInterfaceCall, err := d.astarteAPIClient.GetInterface(d.realm, interfaceName, interfaceMajor)
	if err != nil {
		log.DefaultLogger.Error("Can't query the server for interface", "err", err, "interface", interfaceName, "interfaceMajor", interfaceMajor)
		return interfaces.AstarteInterface{}, err
	}

	log.DefaultLogger.Debug("Querying server for interface", "curl", getInterfaceCall.ToCurl(d.astarteAPIClient))

	getInterfaceRes, err := getInterfaceCall.Run(d.astarteAPIClient)
	if err != nil {
		log.DefaultLogger.Error("Can't retrieve interface data", "err", err, "interface", interfaceName, "interfaceMajor", interfaceMajor)
		return interfaces.AstarteInterface{}, err
	}
	rawIface, err := getInterfaceRes.Parse()
	if err != nil {
		log.DefaultLogger.Error("Unexpected interface payload", "err", err, "interface", interfaceName, "interfaceMajor", interfaceMajor)
		return interfaces.AstarteInterface{}, err
	}
	iface, _ := rawIface.(interfaces.AstarteInterface)

	log.DefaultLogger.Debug("Received doc for interface", "interface", interfaceName, "major", interfaceMajor)

	return iface, nil
}

type introspectionEntry struct {
	Name  string `json:"name"`
	Major int    `json:"major"`
	Minor int    `json:"minor"`
}

func (d *AppEngineDatasource) getDeviceIntrospection(deviceID string) ([]introspectionEntry, error) {
	getDeviceDetailsCall, err := d.astarteAPIClient.GetDeviceDetails(d.realm, deviceID, client.AstarteDeviceID)
	if err != nil {
		log.DefaultLogger.Error("Can't query the server for device introspection", "err", err, "device_id", deviceID)
		return nil, err
	}

	log.DefaultLogger.Debug("Querying server for introspection", "curl", getDeviceDetailsCall.ToCurl(d.astarteAPIClient))

	getDeviceDetailsRes, err := getDeviceDetailsCall.Run(d.astarteAPIClient)
	if err != nil {
		log.DefaultLogger.Error("Can't retrieve device introspection", "err", err, "device_id", deviceID)
		return nil, err
	}
	rawDetails, err := getDeviceDetailsRes.Parse()
	if err != nil {
		log.DefaultLogger.Error("Unexpected device details payload", "err", err, "device_id", deviceID)
		return nil, err
	}
	details, _ := rawDetails.(client.DeviceDetails)
	log.DefaultLogger.Info("Received Astarte introspection for device", "device_id", deviceID)
	interfaces := []introspectionEntry{}
	for interfaceName, interfaceDetails := range details.Introspection {
		interfaces = append(interfaces, introspectionEntry{Name: interfaceName, Major: interfaceDetails.Major, Minor: interfaceDetails.Minor})
	}

	return interfaces, nil
}

func sendResult(body []byte, sender backend.CallResourceResponseSender) error {
	log.DefaultLogger.Debug("Sending call resource response")
	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusOK,
		Body:   body,
	})
}

func sendBadRequest(err error, sender backend.CallResourceResponseSender) error {
	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusBadRequest,
		Body:   []byte(err.Error()),
	})
}
