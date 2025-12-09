package utils

type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

func WrapWebSocketMessage(eventType string, data interface{}) map[string]interface{} {
	return map[string]interface{}{
		"type": eventType,
		"data": data,
	}
}
