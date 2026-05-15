package call

import (
	"chat-server/internal/utils"
	"time"
)

type StartCallRequest struct {
	ConversationID string `json:"conversationId" binding:"required,uuid"`
	CallType       string `json:"callType" binding:"required,oneof=audio video"`
}

type CallTokenResponse struct {
	CallID         string    `json:"callId"`
	RoomName       string    `json:"roomName"`
	Token          string    `json:"token"`
	WsURL          string    `json:"wsUrl"`
	ConversationID string    `json:"conversationId"`
	CallerID       string    `json:"callerId"`
	CallType       string    `json:"callType"`
	Status         string    `json:"status"`
	StartedAt      time.Time `json:"startedAt"`
}

type SimpleSuccessResponse struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"OK"`
}

type CallTokenSuccessResponse = utils.BaseResponse[CallTokenResponse]
