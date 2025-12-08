package conversation

import (
	"chat-server/internal/middleware"
	"chat-server/internal/utils"
	"net/http"
	"strconv"

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
		logger:  logger.Named("[conversation_controller]"),
	}
}

// CreateDirectConversation godoc
// @Summary      Create direct conversation
// @Description  Create or get existing direct conversation between two users
// @Tags         conversations
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreateDirectConversationRequest true "Create Direct Conversation"
// @Success      201  {object}  ConversationSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /conversations/direct [post]
func (ctrl *Controller) CreateDirectConversation(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	var req CreateDirectConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	recipientID, err := uuid.Parse(req.RecipientID)
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid recipient ID")
	}

	conversation, err := ctrl.service.CreateDirectConversation(userID, recipientID)
	if err != nil {
		ctrl.logger.Errorw("Failed to create direct conversation", "error", err)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to create conversation")
	}

	return conversation, nil
}

// CheckDirectConversation godoc
// @Summary      Check direct conversation
// @Description  Check if direct conversation exists without creating it
// @Tags         conversations
// @Produce      json
// @Security     BearerAuth
// @Param        recipientId query string true "Recipient User ID"
// @Success      200  {object}  ConversationSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Router       /conversations/direct/check [get]
func (ctrl *Controller) CheckDirectConversation(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	recipientIDStr := c.Query("recipientId")
	if recipientIDStr == "" {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "recipientId is required")
	}

	recipientID, err := uuid.Parse(recipientIDStr)
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid recipient ID")
	}

	conversation, err := ctrl.service.CheckDirectConversation(userID, recipientID)
	if err != nil {
		ctrl.logger.Errorw("Failed to check direct conversation", "error", err)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to check conversation")
	}

	return conversation, nil
}

// CreateGroupConversation godoc
// @Summary      Create group conversation
// @Description  Create a new group conversation with multiple participants
// @Tags         conversations
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body CreateGroupConversationRequest true "Create Group Conversation"
// @Success      201  {object}  ConversationSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Router       /conversations/group [post]
func (ctrl *Controller) CreateGroupConversation(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	var req CreateGroupConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	participantIDs := make([]uuid.UUID, 0, len(req.ParticipantIDs))
	for _, idStr := range req.ParticipantIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid participant ID: "+idStr)
		}
		participantIDs = append(participantIDs, id)
	}

	conversation, err := ctrl.service.CreateGroupConversation(userID, req.Name, participantIDs)
	if err != nil {
		ctrl.logger.Errorw("Failed to create group conversation", "error", err)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to create conversation")
	}

	return conversation, nil
}

// GetUserConversations godoc
// @Summary      Get user conversations
// @Description  Get all conversations for the authenticated user
// @Tags         conversations
// @Produce      json
// @Security     BearerAuth
// @Param        limit query int false "Limit number of conversations" default(50)
// @Success      200  {object}  ConversationsListSuccessResponse
// @Failure      401  {object}  utils.APIError
// @Router       /conversations [get]
func (ctrl *Controller) GetUserConversations(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	conversations, err := ctrl.service.GetUserConversations(userID, limit)
	if err != nil {
		ctrl.logger.Errorw("Failed to get user conversations", "error", err)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to get conversations")
	}

	return conversations, nil
}

// MarkConversationAsRead godoc
// @Summary      Mark conversation as read
// @Description  Mark all messages in a conversation as read for the authenticated user
// @Tags         conversations
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Conversation ID"
// @Success      200  {object}  SimpleSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      403  {object}  utils.APIError
// @Router       /conversations/{id}/read [put]
func (ctrl *Controller) MarkConversationAsRead(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid conversation ID")
	}

	if err := ctrl.service.MarkConversationAsRead(userID, conversationID); err != nil {
		ctrl.logger.Errorw("Failed to mark conversation as read", "error", err)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to mark conversation as read")
	}

	return map[string]string{"message": "Conversation marked as read successfully"}, nil
}

// HideConversation godoc
// @Summary      Hide conversation
// @Description  Hide a conversation from the user's inbox. It will reappear when a new message arrives.
// @Tags         conversations
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Conversation ID"
// @Success      200  {object}  HideConversationResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      403  {object}  utils.APIError
// @Router       /conversations/{id}/hide [post]
func (ctrl *Controller) HideConversation(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid conversation ID")
	}

	if err := ctrl.service.HideConversation(userID, conversationID); err != nil {
		ctrl.logger.Errorw("Failed to hide conversation", "error", err, "user_id", userID, "conversation_id", conversationID)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to hide conversation")
	}

	return &HideConversationResponse{
		Success: true,
		Message: "Conversation hidden successfully",
	}, nil
}

// UnhideConversation godoc
// @Summary      Unhide conversation
// @Description  Manually unhide a previously hidden conversation
// @Tags         conversations
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Conversation ID"
// @Success      200  {object}  UnhideConversationResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /conversations/{id}/unhide [post]
func (ctrl *Controller) UnhideConversation(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid conversation ID")
	}

	if err := ctrl.service.UnhideConversation(userID, conversationID); err != nil {
		ctrl.logger.Errorw("Failed to unhide conversation", "error", err, "user_id", userID, "conversation_id", conversationID)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to unhide conversation")
	}

	return &UnhideConversationResponse{
		Success: true,
		Message: "Conversation unhidden successfully",
	}, nil
}
