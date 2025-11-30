package health

import "chat-server/internal/utils"

type HealthResponse struct {
	Status   string            `json:"status" example:"healthy"`
	Services map[string]string `json:"services"`
	Version  string            `json:"version" example:"1.0.0"`
}

type ServiceStatus struct {
	Name   string `json:"name"`
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

type HealthSuccessResponse = utils.BaseResponse[HealthResponse]
