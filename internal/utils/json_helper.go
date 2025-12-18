package utils

import "encoding/json"

func ToJSONMap(v interface{}) (map[string]interface{}, error) {
	jsonBytes, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		return nil, err
	}

	return result, nil
}

func MustToJSONMap(v interface{}) map[string]interface{} {
	result, err := ToJSONMap(v)
	if err != nil {
		return make(map[string]interface{})
	}
	return result
}
