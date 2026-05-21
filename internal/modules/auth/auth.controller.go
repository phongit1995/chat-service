package auth

import (
	"chat-server/internal/middleware"
	"chat-server/internal/utils"
	"net/http"
	"strings"

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
		logger:  logger.Named("[auth_controller]"),
	}
}

// Register godoc
// @Summary      Register a new user
// @Description  Register a new user account
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body RegisterRequest true "Register Request"
// @Success      201  {object}  RegisterSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      409  {object}  utils.APIError
// @Router       /auth/register [post]
func (ctrl *Controller) Register(c *gin.Context) (interface{}, error) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ctrl.logger.Warnw("Invalid register request",
			"error", err.Error(),
			"ip", c.ClientIP(),
		)
		return nil, utils.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ctrl.logger.Infow("User registration attempt",
		"email", req.Email,
		"username", req.Username,
		"ip", c.ClientIP(),
	)

	resp, err := ctrl.service.Register(&req)
	if err != nil {
		ctrl.logger.Warnw("Registration failed",
			"email", req.Email,
			"username", req.Username,
			"error", err.Error(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("User registered successfully",
		"user_id", resp.User.ID,
		"email", resp.User.Email,
		"username", resp.User.Username,
	)

	return resp, nil
}

// ChangePassword godoc
// @Summary      Change password
// @Description  Change the authenticated user's password
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body ChangePasswordRequest true "Change Password Request"
// @Success      200  {object}  ChangePasswordSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Router       /auth/change-password [post]
func (ctrl *Controller) ChangePassword(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := ctrl.service.ChangePassword(userID, &req); err != nil {
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	return &ChangePasswordResponse{Message: "Password changed successfully"}, nil
}

// Login godoc
// @Summary      Login user
// @Description  Authenticate user and get access token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body LoginRequest true "Login Request"
// @Success      200  {object}  AuthSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Router       /auth/login [post]
func (ctrl *Controller) Login(c *gin.Context) (interface{}, error) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		ctrl.logger.Warnw("Invalid login request",
			"error", err.Error(),
			"ip", c.ClientIP(),
		)
		return nil, utils.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	ctrl.logger.Infow("User login attempt",
		"email", req.Email,
		"ip", c.ClientIP(),
	)

	resp, err := ctrl.service.Login(&req, c.ClientIP())
	if err != nil {
		ctrl.logger.Warnw("Login failed",
			"email", req.Email,
			"error", err.Error(),
			"ip", c.ClientIP(),
		)
		statusCode := utils.HTTPStatusFromError(err)
		return nil, utils.NewHTTPError(statusCode, err.Error())
	}

	ctrl.logger.Infow("User logged in successfully",
		"user_id", resp.User.ID,
		"email", resp.User.Email,
		"ip", c.ClientIP(),
	)

	return resp, nil
}

// Refresh godoc
// @Summary      Refresh access token
// @Description  Exchange a valid refresh token for a new access token (rotates the refresh token)
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body RefreshTokenRequest true "Refresh Token Request"
// @Success      200 {object} utils.BaseResponse[RefreshTokenResponse]
// @Failure      400 {object} utils.APIError
// @Failure      401 {object} utils.APIError
// @Router       /auth/refresh [post]
func (ctrl *Controller) Refresh(c *gin.Context) (interface{}, error) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	resp, err := ctrl.service.RefreshToken(req.RefreshToken, c.ClientIP())
	if err != nil {
		ctrl.logger.Warnw("Refresh failed", "error", err.Error(), "ip", c.ClientIP())
		return nil, utils.NewHTTPError(utils.HTTPStatusFromError(err), err.Error())
	}

	return resp, nil
}

// Logout godoc
// @Summary      Logout (invalidate token)
// @Description  Blacklist the caller's JWT so it cannot be used again before its natural expiry
// @Tags         auth
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} map[string]string
// @Failure      401 {object} utils.APIError
// @Router       /auth/logout [post]
func (ctrl *Controller) Logout(c *gin.Context) (interface{}, error) {
	userID, exists := middleware.GetUserID(c)
	if !exists {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	authHeader := c.GetHeader("Authorization")
	parts := strings.Split(authHeader, " ")
	token := authHeader
	if len(parts) == 2 && parts[0] == "Bearer" {
		token = parts[1]
	}

	if err := ctrl.service.Logout(token); err != nil {
		return nil, utils.NewHTTPError(utils.HTTPStatusFromError(err), err.Error())
	}

	ctrl.logger.Infow("User logged out", "user_id", userID)
	return map[string]string{"message": "Logged out successfully"}, nil
}
