package message

import (
	"chat-server/internal/middleware"
	"chat-server/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Controller struct {
	service *Service
	logger  *zap.SugaredLogger
}

func NewController(service *Service, logger *zap.SugaredLogger) *Controller {
	return &Controller{
		service: service,
		logger:  logger.Named("[message_controller]"),
	}
}

// SendMessage godoc
// @Summary      Send message
// @Description  Send a message in a conversation
// @Tags         messages
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body SendMessageRequest true "Send Message"
// @Success      201  {object}  MessageSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      403  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /messages [post]
func (ctrl *Controller) SendMessage(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	conversationID, err := uuid.Parse(req.ConversationID)
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid conversation ID")
	}

	var replyToID *uuid.UUID
	if req.ReplyToID != nil && *req.ReplyToID != "" {
		parsed, err := uuid.Parse(*req.ReplyToID)
		if err != nil {
			return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid reply to ID")
		}
		replyToID = &parsed
	}

	message, err := ctrl.service.SendMessage(userID, conversationID, req.Type, req.Content, req.Metadata, replyToID, req.ClientMsgID)
	if err != nil {
		ctrl.logger.Errorw("Failed to send message", "error", err)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to send message")
	}

	return message, nil
}

// SendDirectMessage godoc
// @Summary      Send direct message
// @Description  Send a message directly to a user (creates conversation if not exists)
// @Tags         messages
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body SendDirectMessageRequest true "Send Direct Message"
// @Success      201  {object}  MessageSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /messages/direct [post]
func (ctrl *Controller) SendDirectMessage(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	var req SendDirectMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	recipientID, err := uuid.Parse(req.RecipientID)
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid recipient ID")
	}

	if userID == recipientID {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "cannot send message to yourself")
	}

	message, err := ctrl.service.SendDirectMessage(userID, recipientID, req.Type, req.Content, req.Metadata, req.ClientMsgID)
	if err != nil {
		ctrl.logger.Errorw("Failed to send direct message", "error", err)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to send message")
	}

	return message, nil
}

// GetMessages godoc
// @Summary      Get messages
// @Description  Get messages from a conversation with pagination
// @Tags         messages
// @Produce      json
// @Security     BearerAuth
// @Param        conversationId path string true "Conversation ID"
// @Param        limit query int false "Limit number of messages" default(50)
// @Param        before query string false "Get messages before this message ID (timeuuid)"
// @Success      200  {object}  MessagesListSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      403  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /messages/{conversationId} [get]
func (ctrl *Controller) GetMessages(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	conversationID, err := uuid.Parse(c.Param("conversationId"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid conversation ID")
	}

	limit := utils.ParseLimit(c, 50, 200)

	var beforeMessageID *string
	if before := c.Query("before"); before != "" {
		beforeMessageID = &before
	}

	messages, err := ctrl.service.GetMessages(userID, conversationID, limit, beforeMessageID)
	if err != nil {
		ctrl.logger.Errorw("Failed to get messages", "error", err)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to get messages")
	}

	return messages, nil
}

// UpdateMessage godoc
// @Summary      Update message
// @Description  Update message content (edit message)
// @Tags         messages
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        conversationId path string true "Conversation ID"
// @Param        messageId path string true "Message ID (timeuuid)"
// @Param        request body UpdateMessageRequest true "Update Message"
// @Success      200  {object}  MessageSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      403  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /messages/{conversationId}/{messageId} [patch]
func (ctrl *Controller) UpdateMessage(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	conversationID := c.Param("conversationId")
	messageID := c.Param("messageId")

	var req UpdateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	message, err := ctrl.service.UpdateMessage(userID, conversationID, messageID, req.Content)
	if err != nil {
		ctrl.logger.Errorw("Failed to update message", "error", err)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to update message")
	}

	return message, nil
}

// SendImageMessage godoc
// @Summary      Send image message
// @Description  Upload an image and create a message of type=image in one call (≤2MB jpeg/png/gif/webp)
// @Tags         messages
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        file formData file true "Image file"
// @Param        conversationId formData string true "Conversation ID"
// @Param        clientMsgId formData string false "Idempotency key"
// @Success      201  {object}  MessageSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      403  {object}  utils.APIError
// @Failure      413  {object}  utils.APIError
// @Failure      429  {object}  utils.APIError
// @Router       /messages/images [post]
func (ctrl *Controller) SendImageMessage(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	conversationID, err := uuid.Parse(c.PostForm("conversationId"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid conversation ID")
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "missing file")
	}

	clientMsgID := c.PostForm("clientMsgId")

	result, err := ctrl.service.SendImageMessage(c.Request.Context(), userID, conversationID, fileHeader, clientMsgID)
	if err != nil {
		ctrl.logger.Errorw("Failed to send image message", "error", err)
		status := httpStatusForError(err)
		msg := err.Error()
		if status == http.StatusInternalServerError {
			msg = "failed to send image message"
		}
		return nil, utils.NewHTTPError(status, msg)
	}

	return result, nil
}

// ToggleReaction godoc
// @Summary      Toggle reaction
// @Description  Toggle a reaction (LIKE/LOVE/HAHA/WOW/SAD/ANGRY) on a message. Idempotent per (user, message, type).
// @Tags         messages
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        conversationId path string true "Conversation ID"
// @Param        messageId path string true "Message ID (timeuuid)"
// @Param        request body ToggleReactionRequest true "Reaction type"
// @Success      200  {object}  MessageSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      403  {object}  utils.APIError
// @Failure      429  {object}  utils.APIError
// @Router       /messages/{conversationId}/{messageId}/reactions [post]
func (ctrl *Controller) ToggleReaction(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	conversationID, err := uuid.Parse(c.Param("conversationId"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid conversation ID")
	}
	messageID := c.Param("messageId")

	var req ToggleReactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	result, err := ctrl.service.ToggleReaction(c.Request.Context(), userID, conversationID, messageID, req.Type)
	if err != nil {
		ctrl.logger.Errorw("Failed to toggle reaction", "error", err)
		status := httpStatusForError(err)
		msg := err.Error()
		if status == http.StatusInternalServerError {
			msg = "failed to toggle reaction"
		}
		return nil, utils.NewHTTPError(status, msg)
	}
	return result, nil
}

// DeleteMessage godoc
// @Summary      Delete message
// @Description  Delete a message (soft delete)
// @Tags         messages
// @Produce      json
// @Security     BearerAuth
// @Param        conversationId path string true "Conversation ID"
// @Param        messageId path string true "Message ID (timeuuid)"
// @Success      200  {object}  SimpleSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      403  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /messages/{conversationId}/{messageId} [delete]
func (ctrl *Controller) DeleteMessage(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	conversationID := c.Param("conversationId")
	messageID := c.Param("messageId")

	if err := ctrl.service.DeleteMessage(userID, conversationID, messageID); err != nil {
		ctrl.logger.Errorw("Failed to delete message", "error", err)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to delete message")
	}

	return map[string]string{"message": "Message deleted successfully"}, nil
}
