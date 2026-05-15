package call

import (
	"chat-server/internal/middleware"
	"chat-server/internal/utils"
	"encoding/json"
	"io"
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
		logger:  logger.Named("[call_controller]"),
	}
}

// StartCall godoc
// @Summary      Start a call
// @Description  Create a LiveKit room and notify other participants
// @Tags         calls
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body StartCallRequest true "Start call"
// @Success      201  {object}  CallTokenSuccessResponse
// @Failure      400  {object}  utils.APIError
// @Failure      401  {object}  utils.APIError
// @Failure      403  {object}  utils.APIError
// @Failure      500  {object}  utils.APIError
// @Router       /calls/start [post]
func (ctrl *Controller) StartCall(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}

	var req StartCallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid request body")
	}

	conversationID, err := uuid.Parse(req.ConversationID)
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid conversation ID")
	}

	resp, err := ctrl.service.StartCall(c.Request.Context(), userID, conversationID, req.CallType)
	if err != nil {
		return nil, ctrl.mapErr(err, "failed to start call")
	}
	return resp, nil
}

// AnswerCall godoc
// @Summary      Answer a call
// @Tags         calls
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Call ID"
// @Success      200  {object}  CallTokenSuccessResponse
// @Router       /calls/{id}/answer [post]
func (ctrl *Controller) AnswerCall(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid call ID")
	}
	resp, err := ctrl.service.AnswerCall(c.Request.Context(), callID, userID)
	if err != nil {
		return nil, ctrl.mapErr(err, "failed to answer call")
	}
	return resp, nil
}

// DeclineCall godoc
// @Summary      Decline a call
// @Tags         calls
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Call ID"
// @Success      200  {object}  SimpleSuccessResponse
// @Router       /calls/{id}/decline [post]
func (ctrl *Controller) DeclineCall(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid call ID")
	}
	if err := ctrl.service.DeclineCall(c.Request.Context(), callID, userID); err != nil {
		return nil, ctrl.mapErr(err, "failed to decline call")
	}
	return SimpleSuccessResponse{Success: true, Message: "call declined"}, nil
}

// EndCall godoc
// @Summary      End a call
// @Tags         calls
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Call ID"
// @Success      200  {object}  SimpleSuccessResponse
// @Router       /calls/{id}/end [post]
func (ctrl *Controller) EndCall(c *gin.Context) (interface{}, error) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "user not authenticated")
	}
	callID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "invalid call ID")
	}
	if err := ctrl.service.EndCall(c.Request.Context(), callID, userID); err != nil {
		return nil, ctrl.mapErr(err, "failed to end call")
	}
	return SimpleSuccessResponse{Success: true, Message: "call ended"}, nil
}

// LiveKitWebhook receives LiveKit server callbacks (room_finished, participant_left, ...).
// LiveKit signs the payload with API secret in `Authorization` header.
// We verify the signature, then finalize the call when its room finishes.
func (ctrl *Controller) LiveKitWebhook(c *gin.Context) (interface{}, error) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return nil, utils.NewHTTPError(http.StatusBadRequest, "cannot read body")
	}

	authHeader := c.GetHeader("Authorization")
	if !ctrl.service.VerifyWebhookSignature(authHeader, body) {
		return nil, utils.NewHTTPError(http.StatusUnauthorized, "invalid webhook signature")
	}

	var payload struct {
		Event string `json:"event"`
		Room  struct {
			Name string `json:"name"`
		} `json:"room"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		ctrl.logger.Warnw("Webhook bad payload", "error", err)
		return SimpleSuccessResponse{Success: true, Message: "ignored"}, nil
	}

	ctrl.logger.Infow("LiveKit webhook", "event", payload.Event, "room", payload.Room.Name)

	if payload.Event == "room_finished" && payload.Room.Name != "" {
		if err := ctrl.service.HandleLiveKitRoomFinished(c.Request.Context(), payload.Room.Name); err != nil {
			ctrl.logger.Errorw("Webhook finalize failed", "room", payload.Room.Name, "error", err)
		}
	}
	return SimpleSuccessResponse{Success: true, Message: "ok"}, nil
}

func (ctrl *Controller) mapErr(err error, fallback string) error {
	switch err {
	case ErrCallNotFound:
		return utils.NewHTTPError(http.StatusNotFound, "call not found")
	case ErrConversationNotFound:
		return utils.NewHTTPError(http.StatusForbidden, "conversation not found or you are not a member")
	case ErrCallNotPending:
		return utils.NewHTTPError(http.StatusConflict, "call is not pending")
	case ErrNotAuthorized:
		return utils.NewHTTPError(http.StatusForbidden, "not authorized for this call")
	case ErrLiveKitNotConfigured:
		return utils.NewHTTPError(http.StatusServiceUnavailable, "livekit is not configured")
	}
	ctrl.logger.Errorw(fallback, "error", err)
	return utils.NewHTTPError(http.StatusInternalServerError, fallback)
}
