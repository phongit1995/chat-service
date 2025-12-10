package user

import (
	"chat-server/internal/middleware"
	"chat-server/internal/utils"
	"fmt"
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
// @Router       /user/me [get]
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
// @Router       /user/me [put]
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

// SearchUsers godoc
// @Summary      Search users
// @Description  Search users by username, full name, or email
// @Tags         user
// @Produce      json
// @Security     BearerAuth
// @Param        q query string true "Search query"
// @Param        limit query int false "Limit results" default(20)
// @Success      200  {object}  SearchUsersSuccessResponse
// @Failure      401  {object}  utils.APIError
// @Router       /user/search [get]
func (ctrl *Controller) SearchUsers(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		ctrl.logger.Warnw("User not authenticated",
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
			"ip", c.ClientIP(),
		)
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	query := c.Query("q")
	if query == "" {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "search query is required")
	}

	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		var parsedLimit int
		if _, err := fmt.Sscanf(limitStr, "%d", &parsedLimit); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	ctrl.logger.Infow("Searching users",
		"user_id", userID,
		"query", query,
		"limit", limit,
	)

	results, err := ctrl.service.SearchUsers(query, limit, userID)
	if err != nil {
		ctrl.logger.Errorw("Failed to search users",
			"user_id", userID,
			"query", query,
			"error", err.Error(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("User search completed",
		"user_id", userID,
		"query", query,
		"results_count", results.Total,
	)

	return results, nil
}

// Upload godoc
// @Summary      Upload image
// @Description  Upload image to Cloudinary and get URL (does not update user profile)
// @Tags         upload
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        file formData file true "Image file (jpg, png, gif, webp)"
// @Success      200  {object}  UploadAvatarSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      413  {object}  utils.APIError "File too large"
// @Failure      500  {object}  utils.APIError
// @Router       /user/upload [post]
func (ctrl *Controller) Upload(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		ctrl.logger.Warnw("User not authenticated",
			"path", c.Request.URL.Path,
			"method", c.Request.Method,
			"ip", c.ClientIP(),
		)
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		ctrl.logger.Warnw("Failed to get file from request",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, utils.NewHTTPError(http.StatusBadRequest, "file is required")
	}
	defer file.Close()

	const maxFileSize = 5 * 1024 * 1024
	if header.Size > maxFileSize {
		ctrl.logger.Warnw("File too large",
			"user_id", userID,
			"size", header.Size,
			"max_size", maxFileSize,
		)
		return nil, utils.NewHTTPError(http.StatusRequestEntityTooLarge, "file size must not exceed 5MB")
	}

	ctrl.logger.Infow("Uploading image",
		"user_id", userID,
		"filename", header.Filename,
		"size", header.Size,
	)

	result, err := ctrl.service.UploadImage(c.Request.Context(), userID, file, header.Filename)
	if err != nil {
		ctrl.logger.Errorw("Failed to upload image",
			"user_id", userID,
			"error", err.Error(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("Image uploaded successfully",
		"user_id", userID,
		"url", result.SecureURL,
	)

	return result, nil
}
