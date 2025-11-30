package user

import (
	"chat-server/internal/middleware"
	"chat-server/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Controller struct {
	service *Service
	logger  *zap.SugaredLogger
}

func NewController(service *Service, logger *zap.SugaredLogger) *Controller {
	return &Controller{
		service: service,
		logger:  logger.Named("[user_controller]"),
	}
}

// GetProfile godoc
// @Summary      Get user profile
// @Description  Get authenticated user's profile information
// @Tags         user
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  UserProfileSuccessResponse
// @Failure      401  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /user/profile [get]
func (ctrl *Controller) GetProfile(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		ctrl.logger.Warnw("User not authenticated",
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
			"ip", c.ClientIP(),
		)
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	ctrl.logger.Infow("Getting user profile",
		"user_id", userID,
		"path", c.Request.URL.Path,
	)

	profile, err := ctrl.service.GetProfile(userID)
	if err != nil {
		ctrl.logger.Errorw("Failed to get user profile",
			"user_id", userID,
			"error", err.Error(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("User profile retrieved successfully",
		"user_id", userID,
		"username", profile.Username,
	)

	return profile, nil
}

// UpdateProfile godoc
// @Summary      Update user profile
// @Description  Update authenticated user's profile information
// @Tags         user
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body UpdateProfileRequest true "Update Profile Request"
// @Success      200  {object}  UserProfileSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      404  {object}  utils.APIError
// @Router       /user/profile [put]
func (ctrl *Controller) UpdateProfile(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		ctrl.logger.Warnw("User not authenticated",
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
			"ip", c.ClientIP(),
		)
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ctrl.logger.Warnw("Invalid update profile request",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, utils.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ctrl.logger.Infow("Updating user profile",
		"user_id", userID,
	)

	profile, err := ctrl.service.UpdateProfile(userID, &req)
	if err != nil {
		ctrl.logger.Errorw("Failed to update user profile",
			"user_id", userID,
			"error", err.Error(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("User profile updated successfully",
		"user_id", userID,
		"username", profile.Username,
	)

	return profile, nil
}
