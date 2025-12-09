package conversation

import (
	"chat-server/internal/constants"
	"chat-server/internal/infra/websocket"
	"chat-server/internal/utils"
	"context"
	"encoding/json"
	"errors"

	"go.uber.org/zap"
)

type EventHandler struct {
	wsServer  *websocket.Server
	convCache *ConversationCacheAdapter
	logger    *zap.SugaredLogger
}

func NewEventHandler(
	wsServer *websocket.Server,
	convCache *ConversationCacheAdapter,
	logger *zap.SugaredLogger,
) *EventHandler {
	return &EventHandler{
		wsServer:  wsServer,
		convCache: convCache,
		logger:    logger.Named("[conversation_events]"),
	}
}

func (h *EventHandler) OnCreated(ctx context.Context, message []byte) error {
	h.logger.Debugw("📥 Received CONVERSATION_CREATED from Kafka",
		"raw_size", len(message),
	)

	var event CreatedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		h.logger.Errorw("Failed to unmarshal ConversationCreated", "error", err, "raw_message", string(message))
		return err
	}

	dataJSON, _ := json.Marshal(event.Data)
	h.logger.Infow("🔄 Processing CONVERSATION_CREATED event",
		"conversation_id", event.ConversationID,
		"data", string(dataJSON),
	)

	if err := h.validateCreatedEvent(&event); err != nil {
		h.logger.Errorw("Invalid ConversationCreated event", "error", err)
		return err
	}

	userIDs, err := h.convCache.GetConversationMembers(event.ConversationID)
	if err != nil {
		h.logger.Errorw("Failed to get conversation members from cache",
			"conversation_id", event.ConversationID,
			"error", err,
		)
		return err
	}

	h.logger.Infow("👥 Got conversation members",
		"conversation_id", event.ConversationID,
		"member_count", len(userIDs),
		"user_ids", userIDs,
	)

	if len(userIDs) == 0 {
		h.logger.Warnw("No members found in conversation",
			"conversation_id", event.ConversationID,
		)
		return nil
	}

	h.logger.Infow("📡 Emitting CONVERSATION_CREATED to WebSocket",
		"conversation_id", event.ConversationID,
		"recipient_count", len(userIDs),
		"recipients", userIDs,
		"data", string(dataJSON),
	)

	wrappedData := utils.WrapWebSocketMessage(constants.WebSocketEventConversationCreated, event.Data)
	h.wsServer.EmitToUsers(userIDs, constants.WebSocketMessageEvent, wrappedData)

	h.logger.Infow("✅ CONVERSATION_CREATED processed successfully",
		"conversation_id", event.ConversationID,
		"emitted_to", len(userIDs),
	)

	return nil
}

func (h *EventHandler) OnUpdated(ctx context.Context, message []byte) error {
	h.logger.Debugw("📥 Received CONVERSATION_UPDATED from Kafka",
		"raw_size", len(message),
	)

	var event UpdatedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		h.logger.Errorw("Failed to unmarshal ConversationUpdated", "error", err, "raw_message", string(message))
		return err
	}

	dataJSON, _ := json.Marshal(event.Data)
	h.logger.Infow("🔄 Processing CONVERSATION_UPDATED event",
		"conversation_id", event.ConversationID,
		"data", string(dataJSON),
	)

	if err := h.validateUpdatedEvent(&event); err != nil {
		h.logger.Errorw("Invalid ConversationUpdated event", "error", err)
		return err
	}

	userIDs, err := h.convCache.GetConversationMembers(event.ConversationID)
	if err != nil {
		h.logger.Errorw("Failed to get conversation members from cache",
			"conversation_id", event.ConversationID,
			"error", err,
		)
		return err
	}

	h.logger.Infow("👥 Got conversation members",
		"conversation_id", event.ConversationID,
		"member_count", len(userIDs),
		"user_ids", userIDs,
	)

	if len(userIDs) == 0 {
		h.logger.Warnw("No members found in conversation",
			"conversation_id", event.ConversationID,
		)
		return nil
	}

	h.logger.Infow("📡 Emitting CONVERSATION_UPDATED to WebSocket",
		"conversation_id", event.ConversationID,
		"recipient_count", len(userIDs),
		"recipients", userIDs,
		"data", string(dataJSON),
	)

	wrappedData := utils.WrapWebSocketMessage(constants.WebSocketEventConversationUpdated, event.Data)
	h.wsServer.EmitToUsers(userIDs, constants.WebSocketMessageEvent, wrappedData)

	h.logger.Infow("✅ CONVERSATION_UPDATED processed successfully",
		"conversation_id", event.ConversationID,
		"emitted_to", len(userIDs),
	)

	return nil
}

func (h *EventHandler) OnDeleted(ctx context.Context, message []byte) error {
	h.logger.Debugw("📥 Received CONVERSATION_DELETED from Kafka",
		"raw_size", len(message),
	)

	var event DeletedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		h.logger.Errorw("Failed to unmarshal ConversationDeleted", "error", err, "raw_message", string(message))
		return err
	}

	h.logger.Infow("🔄 Processing CONVERSATION_DELETED event",
		"conversation_id", event.ConversationID,
	)

	if err := h.validateDeletedEvent(&event); err != nil {
		h.logger.Errorw("Invalid ConversationDeleted event", "error", err)
		return err
	}

	h.logger.Infow("✅ CONVERSATION_DELETED processed successfully",
		"conversation_id", event.ConversationID,
	)

	return nil
}

func (h *EventHandler) validateCreatedEvent(event *CreatedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	return nil
}

func (h *EventHandler) validateUpdatedEvent(event *UpdatedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	return nil
}

func (h *EventHandler) validateDeletedEvent(event *DeletedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	return nil
}
