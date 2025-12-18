package utils

type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

func WrapWebSocketMessage(eventType string, data interface{}) map[string]interface{} {
	if dataMap, ok := data.(map[string]interface{}); ok {
		return map[string]interface{}{
			"type": eventType,
			"data": dataMap,
		}
	}

	convertedData := MustToJSONMap(data)
	return map[string]interface{}{
		"type": eventType,
		"data": convertedData,
	}
}
