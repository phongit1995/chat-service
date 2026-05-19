package relationships

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
		logger:  logger.Named("[relationship_controller]"),
	}
}

// SendFriendRequest godoc
// @Summary      Send friend request
// @Description  Send a friend request to another user
// @Tags         relationships
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body SendFriendRequestRequest true "Send Friend Request"
// @Success      201  {object}  RelationshipSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      409  {object}  utils.APIError
// @Router       /relationships/request [post]
func (ctrl *Controller) SendFriendRequest(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	var req SendFriendRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ctrl.logger.Warnw("Invalid send friend request",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, utils.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	addresseeID, err := uuid.Parse(req.AddresseeID)
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid addressee ID")
	}

	ctrl.logger.Infow("Sending friend request",
		"requester_id", userID,
		"addressee_id", addresseeID,
	)

	response, err := ctrl.service.SendFriendRequest(userID, addresseeID)
	if err != nil {
		ctrl.logger.Warnw("Failed to send friend request",
			"requester_id", userID,
			"addressee_id", req.AddresseeID,
			"error", err.Error(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("Friend request sent successfully",
		"requester_id", userID,
		"addressee_id", req.AddresseeID,
	)

	return response, nil
}

// RespondToFriendRequest godoc
// @Summary      Respond to friend request
// @Description  Accept or reject a friend request
// @Tags         relationships
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Relationship ID (UUID)"
// @Param        request body RespondToRequestRequest true "Response Action"
// @Success      200  {object}  RelationshipSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /relationships/{id}/respond [put]
func (ctrl *Controller) RespondToFriendRequest(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	relationshipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid relationship ID")
	}

	var req RespondToRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ctrl.logger.Infow("Responding to friend request",
		"relationship_id", relationshipID,
		"user_id", userID,
		"action", req.Action,
	)

	if req.Action == "accept" {
		response, err := ctrl.service.AcceptFriendRequest(relationshipID, userID)
		if err != nil {
			ctrl.logger.Warnw("Failed to accept friend request",
				"relationship_id", relationshipID,
				"error", err.Error(),
			)
			statusCode := utils.HTTPStatusFromError(err)
			return nil, utils.NewHTTPError(statusCode, err.Error())
		}
		return response, nil
	} else if req.Action == "reject" {
		if err := ctrl.service.RejectFriendRequest(relationshipID, userID); err != nil {
			ctrl.logger.Warnw("Failed to reject friend request",
				"relationship_id", relationshipID,
				"error", err.Error(),
			)
			statusCode := utils.HTTPStatusFromError(err)
			return nil, utils.NewHTTPError(statusCode, err.Error())
		}
		return map[string]string{"message": "Friend request rejected successfully"}, nil
	}

	return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid action")
}

// CancelFriendRequest godoc
// @Summary      Cancel friend request
// @Description  Cancel a sent friend request
// @Tags         relationships
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Relationship ID (UUID)"
// @Success      200  {object}  map[string]string
// @Failure      401  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /relationships/{id}/cancel [delete]
func (ctrl *Controller) CancelFriendRequest(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	relationshipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid relationship ID")
	}

	if err := ctrl.service.CancelFriendRequest(relationshipID, userID); err != nil {
		ctrl.logger.Warnw("Failed to cancel friend request",
			"relationship_id", relationshipID,
			"error", err.Error(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("Friend request cancelled successfully",
		"relationship_id", relationshipID,
		"user_id", userID,
	)

	return map[string]string{"message": "Friend request cancelled successfully"}, nil
}

// Unfriend godoc
// @Summary      Unfriend a user
// @Description  Remove a friendship with another user
// @Tags         relationships
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Relationship ID (UUID)"
// @Success      200  {object}  map[string]string
// @Failure      401  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /relationships/{id}/unfriend [delete]
func (ctrl *Controller) Unfriend(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	relationshipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid relationship ID")
	}

	if err := ctrl.service.Unfriend(relationshipID, userID); err != nil {
		ctrl.logger.Warnw("Failed to unfriend",
			"relationship_id", relationshipID,
			"error", err.Error(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("Unfriended successfully",
		"relationship_id", relationshipID,
		"user_id", userID,
	)

	return map[string]string{"message": "Unfriended successfully"}, nil
}

// BlockUser godoc
// @Summary      Block a user
// @Description  Block another user
// @Tags         relationships
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body BlockUserRequest true "Block User Request"
// @Success      201  {object}  RelationshipSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Router       /relationships/block [post]
func (ctrl *Controller) BlockUser(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	var req BlockUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	blockedID, err := uuid.Parse(req.UserID)
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid user ID")
	}

	ctrl.logger.Infow("Blocking user",
		"blocker_id", userID,
		"blocked_id", blockedID,
	)

	response, err := ctrl.service.BlockUser(userID, blockedID)
	if err != nil {
		ctrl.logger.Warnw("Failed to block user",
			"blocker_id", userID,
			"blocked_id", req.UserID,
			"error", err.Error(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("User blocked successfully",
		"blocker_id", userID,
		"blocked_id", req.UserID,
	)

	return response, nil
}

// UnblockUser godoc
// @Summary      Unblock a user
// @Description  Unblock a previously blocked user
// @Tags         relationships
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Relationship ID (UUID)"
// @Success      200  {object}  map[string]string
// @Failure      401  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /relationships/{id}/unblock [delete]
func (ctrl *Controller) UnblockUser(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	relationshipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid relationship ID")
	}

	if err := ctrl.service.UnblockUser(relationshipID, userID); err != nil {
		ctrl.logger.Warnw("Failed to unblock user",
			"relationship_id", relationshipID,
			"error", err.Error(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("User unblocked successfully",
		"relationship_id", relationshipID,
		"user_id", userID,
	)

	return map[string]string{"message": "User unblocked successfully"}, nil
}

// GetPendingRequests godoc
// @Summary      Get pending friend requests
// @Description  Get pending friend requests received by the user (paginated)
// @Tags         relationships
// @Produce      json
// @Security     BearerAuth
// @Param        limit  query int false "Limit results (max 100)" default(20)
// @Param        offset query int false "Offset for pagination" default(0)
// @Success      200  {object}  RelationshipListSuccessResponse
// @Failure      401  {object}  utils.APIError
// @Router       /relationships/pending [get]
func (ctrl *Controller) GetPendingRequests(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	limit := utils.ParseLimit(c, 20, 100)
	offset := utils.ParseOffset(c)

	response, err := ctrl.service.GetPendingRequests(userID, limit, offset)
	if err != nil {
		ctrl.logger.Errorw("Failed to get pending requests",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to retrieve pending requests")
	}

	return response, nil
}

// GetSentRequests godoc
// @Summary      Get sent friend requests
// @Description  Get friend requests sent by the user (paginated)
// @Tags         relationships
// @Produce      json
// @Security     BearerAuth
// @Param        limit  query int false "Limit results (max 100)" default(20)
// @Param        offset query int false "Offset for pagination" default(0)
// @Success      200  {object}  RelationshipListSuccessResponse
// @Failure      401  {object}  utils.APIError
// @Router       /relationships/sent [get]
func (ctrl *Controller) GetSentRequests(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	limit := utils.ParseLimit(c, 20, 100)
	offset := utils.ParseOffset(c)

	response, err := ctrl.service.GetSentRequests(userID, limit, offset)
	if err != nil {
		ctrl.logger.Errorw("Failed to get sent requests",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to retrieve sent requests")
	}

	return response, nil
}

// GetFriends godoc
// @Summary      Get friends list
// @Description  Get friends of the user (paginated)
// @Tags         relationships
// @Produce      json
// @Security     BearerAuth
// @Param        limit  query int false "Limit results (max 100)" default(50)
// @Param        offset query int false "Offset for pagination" default(0)
// @Success      200  {object}  FriendListSuccessResponse
// @Failure      401  {object}  utils.APIError
// @Router       /relationships/friends [get]
func (ctrl *Controller) GetFriends(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	limit := utils.ParseLimit(c, 50, 100)
	offset := utils.ParseOffset(c)

	response, err := ctrl.service.GetFriends(userID, limit, offset)
	if err != nil {
		ctrl.logger.Errorw("Failed to get friends",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to retrieve friends")
	}

	return response, nil
}

// GetBlockedUsers godoc
// @Summary      Get blocked users
// @Description  Get users blocked by the user (paginated)
// @Tags         relationships
// @Produce      json
// @Security     BearerAuth
// @Param        limit  query int false "Limit results (max 100)" default(20)
// @Param        offset query int false "Offset for pagination" default(0)
// @Success      200  {object}  RelationshipListSuccessResponse
// @Failure      401  {object}  utils.APIError
// @Router       /relationships/blocked [get]
func (ctrl *Controller) GetBlockedUsers(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	limit := utils.ParseLimit(c, 20, 100)
	offset := utils.ParseOffset(c)

	response, err := ctrl.service.GetBlockedUsers(userID, limit, offset)
	if err != nil {
		ctrl.logger.Errorw("Failed to get blocked users",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, utils.NewHTTPError(http.StatusInternalServerError, "failed to retrieve blocked users")
	}

	return response, nil
}
