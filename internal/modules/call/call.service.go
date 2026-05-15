package call

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
	callEvents "chat-server/internal/domain/call"
	"chat-server/internal/models"
	"chat-server/internal/modules/conversation"
	"chat-server/internal/transport/kafka"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/livekit/protocol/auth"
	"go.uber.org/zap"
)

var (
	ErrConversationNotFound = errors.New("conversation not found or user not a member")
	ErrCallNotFound         = errors.New("call not found")
	ErrCallNotPending       = errors.New("call is not pending")
	ErrNotAuthorized        = errors.New("not authorized for this call")
	ErrLiveKitNotConfigured = errors.New("livekit is not configured")
)

type Service struct {
	repo        *Repository
	convService *conversation.Service
	producer    *kafka.Producer
	cfg         *config.Config
	logger      *zap.SugaredLogger

	timers   map[uuid.UUID]*time.Timer
	timersMu sync.Mutex
}

func NewService(
	repo *Repository,
	convService *conversation.Service,
	producer *kafka.Producer,
	cfg *config.Config,
	logger *zap.SugaredLogger,
) *Service {
	return &Service{
		repo:        repo,
		convService: convService,
		producer:    producer,
		cfg:         cfg,
		logger:      logger.Named("[call_service]"),
		timers:      make(map[uuid.UUID]*time.Timer),
	}
}

func (s *Service) StartCall(ctx context.Context, callerID, conversationID uuid.UUID, callType string) (*CallTokenResponse, error) {
	if s.cfg.LiveKitAPIKey == "" || s.cfg.LiveKitAPISecret == "" {
		return nil, ErrLiveKitNotConfigured
	}

	members, err := s.convService.GetMembersCached(conversationID)
	if err != nil {
		return nil, fmt.Errorf("get members: %w", err)
	}

	memberIDs := make([]uuid.UUID, 0, len(members))
	callerIsMember := false
	for _, m := range members {
		if !m.IsActive {
			continue
		}
		memberIDs = append(memberIDs, m.UserID)
		if m.UserID == callerID {
			callerIsMember = true
		}
	}
	if !callerIsMember {
		return nil, ErrConversationNotFound
	}

	roomName := fmt.Sprintf("call_%s_%s", conversationID.String(), uuid.New().String()[:8])

	participantsStr := uuidsToStrings(memberIDs)

	now := time.Now()
	call := &models.Call{
		ConversationID: conversationID,
		CallerID:       callerID,
		CallType:       models.CallType(callType),
		RoomName:       roomName,
		Status:         models.CallStatusRinging,
		Participants:   participantsStr,
		StartedAt:      now,
	}

	if err := s.repo.Create(call); err != nil {
		return nil, fmt.Errorf("create call: %w", err)
	}

	token, err := s.mintToken(callerID.String(), roomName)
	if err != nil {
		return nil, fmt.Errorf("mint token: %w", err)
	}

	recipients := excludeUserStr(participantsStr, callerID.String())
	if err := s.producer.PublishCallInvited(ctx, &callEvents.InvitedEvent{
		CallID:         call.ID.String(),
		ConversationID: conversationID.String(),
		CallerID:       callerID.String(),
		CallType:       callType,
		RoomName:       roomName,
		Recipients:     recipients,
		StartedAt:      now,
	}); err != nil {
		s.logger.Warnw("Failed to publish CallInvited", "error", err)
	}

	s.scheduleTimeout(call.ID)

	return &CallTokenResponse{
		CallID:         call.ID.String(),
		RoomName:       roomName,
		Token:          token,
		WsURL:          s.cfg.LiveKitURL,
		ConversationID: conversationID.String(),
		CallerID:       callerID.String(),
		CallType:       callType,
		Status:         string(call.Status),
		StartedAt:      now,
	}, nil
}

func (s *Service) AnswerCall(ctx context.Context, callID, userID uuid.UUID) (*CallTokenResponse, error) {
	call, err := s.repo.FindByID(callID)
	if err != nil {
		return nil, ErrCallNotFound
	}
	if call.Status != models.CallStatusRinging {
		return nil, ErrCallNotPending
	}
	if !containsUUID(call.Participants, userID.String()) {
		return nil, ErrNotAuthorized
	}
	if call.CallerID == userID {
		return nil, ErrNotAuthorized
	}

	if err := s.repo.MarkAnswered(callID); err != nil {
		return nil, fmt.Errorf("mark answered: %w", err)
	}

	s.cancelTimeout(callID)

	token, err := s.mintToken(userID.String(), call.RoomName)
	if err != nil {
		return nil, fmt.Errorf("mint token: %w", err)
	}

	if err := s.producer.PublishCallAccepted(ctx, &callEvents.AcceptedEvent{
		CallID:         call.ID.String(),
		ConversationID: call.ConversationID.String(),
		AnsweredBy:     userID.String(),
		Recipients:     excludeUserStr(call.Participants, userID.String()),
	}); err != nil {
		s.logger.Warnw("Failed to publish CallAccepted", "error", err)
	}

	answeredAt := time.Now()
	return &CallTokenResponse{
		CallID:         call.ID.String(),
		RoomName:       call.RoomName,
		Token:          token,
		WsURL:          s.cfg.LiveKitURL,
		ConversationID: call.ConversationID.String(),
		CallerID:       call.CallerID.String(),
		CallType:       string(call.CallType),
		Status:         string(models.CallStatusActive),
		StartedAt:      answeredAt,
	}, nil
}

func (s *Service) DeclineCall(ctx context.Context, callID, userID uuid.UUID) error {
	call, err := s.repo.FindByID(callID)
	if err != nil {
		return ErrCallNotFound
	}
	if call.Status != models.CallStatusRinging {
		return ErrCallNotPending
	}
	if !containsUUID(call.Participants, userID.String()) {
		return ErrNotAuthorized
	}
	if call.CallerID == userID {
		return ErrNotAuthorized
	}

	if _, err := s.repo.MarkEnded(callID, models.CallStatusDeclined); err != nil {
		return err
	}

	s.cancelTimeout(callID)

	if err := s.producer.PublishCallDeclined(ctx, &callEvents.DeclinedEvent{
		CallID:         call.ID.String(),
		ConversationID: call.ConversationID.String(),
		DeclinedBy:     userID.String(),
		Recipients:     excludeUserStr(call.Participants, userID.String()),
	}); err != nil {
		s.logger.Warnw("Failed to publish CallDeclined", "error", err)
	}
	return nil
}

func (s *Service) EndCall(ctx context.Context, callID, userID uuid.UUID) error {
	call, err := s.repo.FindByID(callID)
	if err != nil {
		return ErrCallNotFound
	}
	if !containsUUID(call.Participants, userID.String()) {
		return ErrNotAuthorized
	}
	if call.Status == models.CallStatusEnded ||
		call.Status == models.CallStatusDeclined ||
		call.Status == models.CallStatusMissed {
		return nil
	}
	return s.finalizeCall(ctx, call, userID.String())
}

func (s *Service) finalizeCall(ctx context.Context, call *models.Call, endedBy string) error {
	finalStatus := models.CallStatusEnded
	if call.Status == models.CallStatusRinging {
		finalStatus = models.CallStatusMissed
	}

	updated, err := s.repo.MarkEnded(call.ID, finalStatus)
	if err != nil {
		return err
	}

	s.cancelTimeout(call.ID)

	dur := 0
	if updated.DurationSeconds != nil {
		dur = *updated.DurationSeconds
	}

	if err := s.producer.PublishCallEnded(ctx, &callEvents.EndedEvent{
		CallID:          call.ID.String(),
		ConversationID:  call.ConversationID.String(),
		EndedBy:         endedBy,
		Status:          string(finalStatus),
		DurationSeconds: dur,
		Recipients:      call.Participants,
	}); err != nil {
		s.logger.Warnw("Failed to publish CallEnded", "error", err)
	}
	return nil
}

func (s *Service) HandleLiveKitRoomFinished(ctx context.Context, roomName string) error {
	call, err := s.repo.FindByRoomName(roomName)
	if err != nil {
		s.logger.Debugw("Webhook room_finished for unknown room", "room", roomName)
		return nil
	}
	if call.Status == models.CallStatusEnded ||
		call.Status == models.CallStatusDeclined ||
		call.Status == models.CallStatusMissed {
		return nil
	}
	s.logger.Infow("Finalizing call via LiveKit webhook", "callId", call.ID, "room", roomName)
	return s.finalizeCall(ctx, call, "")
}

func (s *Service) scheduleTimeout(callID uuid.UUID) {
	s.timersMu.Lock()
	if existing, ok := s.timers[callID]; ok {
		existing.Stop()
	}
	timeout := s.cfg.CallRingTimeoutSeconds
	if timeout <= 0 {
		timeout = constants.CallRingTimeoutSeconds
	}
	timer := time.AfterFunc(time.Duration(timeout)*time.Second, func() {
		s.handleTimeout(callID)
	})
	s.timers[callID] = timer
	s.timersMu.Unlock()
}

func (s *Service) cancelTimeout(callID uuid.UUID) {
	s.timersMu.Lock()
	defer s.timersMu.Unlock()
	if t, ok := s.timers[callID]; ok {
		t.Stop()
		delete(s.timers, callID)
	}
}

func (s *Service) handleTimeout(callID uuid.UUID) {
	s.timersMu.Lock()
	delete(s.timers, callID)
	s.timersMu.Unlock()

	call, err := s.repo.FindByID(callID)
	if err != nil {
		return
	}
	if call.Status != models.CallStatusRinging {
		return
	}
	s.logger.Infow("Call timed out — marking missed", "callId", callID)
	if err := s.finalizeCall(context.Background(), call, ""); err != nil {
		s.logger.Errorw("Timeout finalize failed", "callId", callID, "error", err)
	}
}

// VerifyWebhookSignature validates LiveKit's signed JWT in the Authorization
// header against the raw request body. LiveKit signs each webhook with the
// project API secret; the JWT carries a sha256 hash of the body in its claims.
func (s *Service) VerifyWebhookSignature(authHeader string, body []byte) bool {
	if authHeader == "" || s.cfg.LiveKitAPISecret == "" {
		return false
	}
	v, err := auth.ParseAPIToken(authHeader)
	if err != nil {
		return false
	}
	if v.APIKey() != s.cfg.LiveKitAPIKey {
		return false
	}
	_, grants, err := v.Verify(s.cfg.LiveKitAPISecret)
	if err != nil || grants == nil {
		return false
	}
	hash := sha256.Sum256(body)
	want := base64.StdEncoding.EncodeToString(hash[:])
	return grants.Sha256 == want
}

func (s *Service) mintToken(identity, roomName string) (string, error) {
	at := auth.NewAccessToken(s.cfg.LiveKitAPIKey, s.cfg.LiveKitAPISecret)
	canPub := true
	canSub := true
	grant := &auth.VideoGrant{
		RoomJoin:     true,
		Room:         roomName,
		CanPublish:   &canPub,
		CanSubscribe: &canSub,
	}
	at.SetVideoGrant(grant).
		SetIdentity(identity).
		SetValidFor(time.Hour)
	return at.ToJWT()
}

func uuidsToStrings(ids []uuid.UUID) []string {
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		out = append(out, id.String())
	}
	return out
}

func containsUUID(list []string, target string) bool {
	for _, s := range list {
		if s == target {
			return true
		}
	}
	return false
}

func excludeUserStr(list []string, exclude string) []string {
	out := make([]string, 0, len(list))
	for _, s := range list {
		if s != exclude {
			out = append(out, s)
		}
	}
	return out
}
