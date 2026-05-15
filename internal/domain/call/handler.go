package call

import (
	"chat-server/internal/constants"
	"chat-server/internal/transport/websocket"
	"chat-server/internal/utils"
	"context"
	"encoding/json"

	"go.uber.org/zap"
)

type EventHandler struct {
	wsServer *websocket.Server
	logger   *zap.SugaredLogger
}

func NewEventHandler(wsServer *websocket.Server, logger *zap.SugaredLogger) *EventHandler {
	return &EventHandler{
		wsServer: wsServer,
		logger:   logger.Named("[call_events]"),
	}
}

func (h *EventHandler) OnInvited(ctx context.Context, message []byte) error {
	var event InvitedEvent
	if err := json.Unmarshal(message, &event); err != nil {
		h.logger.Errorw("Failed to unmarshal CallInvited", "error", err)
		return err
	}
	h.logger.Infow("📞 INCOMING_CALL", "callId", event.CallID, "recipients", len(event.Recipients))
	h.wsServer.EmitToUsers(event.Recipients, constants.WebSocketMessageEvent,
		utils.WrapWebSocketMessage(constants.WebSocketEventIncomingCall, map[string]interface{}{
			"callId":         event.CallID,
			"conversationId": event.ConversationID,
			"callerId":       event.CallerID,
			"callType":       event.CallType,
			"roomName":       event.RoomName,
			"startedAt":      event.StartedAt,
		}),
	)
	return nil
}

func (h *EventHandler) OnAccepted(ctx context.Context, message []byte) error {
	var event AcceptedEvent
	if err := json.Unmarshal(message, &event); err != nil {
		return err
	}
	h.logger.Infow("✅ CALL_ACCEPTED", "callId", event.CallID)
	h.wsServer.EmitToUsers(event.Recipients, constants.WebSocketMessageEvent,
		utils.WrapWebSocketMessage(constants.WebSocketEventCallAccepted, map[string]interface{}{
			"callId":         event.CallID,
			"conversationId": event.ConversationID,
			"answeredBy":     event.AnsweredBy,
		}),
	)
	return nil
}

func (h *EventHandler) OnDeclined(ctx context.Context, message []byte) error {
	var event DeclinedEvent
	if err := json.Unmarshal(message, &event); err != nil {
		return err
	}
	h.logger.Infow("❌ CALL_DECLINED", "callId", event.CallID)
	h.wsServer.EmitToUsers(event.Recipients, constants.WebSocketMessageEvent,
		utils.WrapWebSocketMessage(constants.WebSocketEventCallDeclined, map[string]interface{}{
			"callId":         event.CallID,
			"conversationId": event.ConversationID,
			"declinedBy":     event.DeclinedBy,
		}),
	)
	return nil
}

func (h *EventHandler) OnEnded(ctx context.Context, message []byte) error {
	var event EndedEvent
	if err := json.Unmarshal(message, &event); err != nil {
		return err
	}
	h.logger.Infow("🔚 CALL_ENDED", "callId", event.CallID, "status", event.Status, "duration", event.DurationSeconds)
	h.wsServer.EmitToUsers(event.Recipients, constants.WebSocketMessageEvent,
		utils.WrapWebSocketMessage(constants.WebSocketEventCallEnded, map[string]interface{}{
			"callId":          event.CallID,
			"conversationId":  event.ConversationID,
			"endedBy":         event.EndedBy,
			"status":          event.Status,
			"durationSeconds": event.DurationSeconds,
		}),
	)
	return nil
}
