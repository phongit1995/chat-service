package relationships

import (
	"chat-server/internal/models"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type Service struct {
	repo   *Repository
	logger *zap.SugaredLogger
}

func NewService(repo *Repository, logger *zap.SugaredLogger) *Service {
	return &Service{
		repo:   repo,
		logger: logger.Named("[relationship_service]"),
	}
}

func (s *Service) SendFriendRequest(requesterID, addresseeID uuid.UUID) (*RelationshipResponse, error) {
	if requesterID == addresseeID {
		s.logger.Warnw("User tried to send friend request to themselves",
			"user_id", requesterID,
		)
		return nil, errors.New("cannot send friend request to yourself")
	}

	exists, err := s.repo.CheckRelationshipExists(requesterID, addresseeID)
	if err != nil {
		s.logger.Errorw("Failed to check existing relationship",
			"requester_id", requesterID,
			"addressee_id", addresseeID,
			"error", err.Error(),
		)
		return nil, err
	}

	if exists {
		isBlocked, err := s.repo.IsBlocked(addresseeID, requesterID)
		if err != nil {
			return nil, err
		}
		if isBlocked {
			return nil, errors.New("unable to send friend request")
		}

		return nil, errors.New("relationship already exists between these users")
	}

	relationship := &models.Relationship{
		RequesterID: requesterID,
		AddresseeID: addresseeID,
		Status:      models.RelationshipStatusPending,
	}

	if err := s.repo.Create(relationship); err != nil {
		s.logger.Errorw("Failed to create friend request",
			"requester_id", requesterID,
			"addressee_id", addresseeID,
			"error", err.Error(),
		)
		return nil, err
	}

	s.logger.Infow("Friend request sent successfully",
		"relationship_id", relationship.ID,
		"requester_id", requesterID,
		"addressee_id", addresseeID,
	)

	relationship, _ = s.repo.FindByID(relationship.ID)
	return s.buildRelationshipResponse(relationship), nil
}

func (s *Service) AcceptFriendRequest(relationshipID, userID uuid.UUID) (*RelationshipResponse, error) {
	relationship, err := s.repo.FindByID(relationshipID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("friend request not found")
		}
		return nil, err
	}

	if relationship.AddresseeID != userID {
		s.logger.Warnw("Unauthorized accept attempt",
			"relationship_id", relationshipID,
			"user_id", userID,
			"addressee_id", relationship.AddresseeID,
		)
		return nil, errors.New("only the addressee can accept this request")
	}

	if relationship.Status != models.RelationshipStatusPending {
		return nil, fmt.Errorf("cannot accept request with status: %s", relationship.Status)
	}

	relationship.Status = models.RelationshipStatusAccepted
	if err := s.repo.Update(relationship); err != nil {
		s.logger.Errorw("Failed to accept friend request",
			"relationship_id", relationshipID,
			"error", err.Error(),
		)
		return nil, err
	}

	s.logger.Infow("Friend request accepted",
		"relationship_id", relationshipID,
		"requester_id", relationship.RequesterID,
		"addressee_id", relationship.AddresseeID,
	)

	return s.buildRelationshipResponse(relationship), nil
}

func (s *Service) RejectFriendRequest(relationshipID, userID uuid.UUID) error {
	relationship, err := s.repo.FindByID(relationshipID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("friend request not found")
		}
		return err
	}

	if relationship.AddresseeID != userID {
		s.logger.Warnw("Unauthorized reject attempt",
			"relationship_id", relationshipID,
			"user_id", userID,
			"addressee_id", relationship.AddresseeID,
		)
		return errors.New("only the addressee can reject this request")
	}

	if relationship.Status != models.RelationshipStatusPending {
		return fmt.Errorf("cannot reject request with status: %s", relationship.Status)
	}

	relationship.Status = models.RelationshipStatusRejected
	if err := s.repo.Update(relationship); err != nil {
		s.logger.Errorw("Failed to reject friend request",
			"relationship_id", relationshipID,
			"error", err.Error(),
		)
		return err
	}

	s.logger.Infow("Friend request rejected",
		"relationship_id", relationshipID,
		"requester_id", relationship.RequesterID,
		"addressee_id", relationship.AddresseeID,
	)

	return nil
}

func (s *Service) CancelFriendRequest(relationshipID, userID uuid.UUID) error {
	relationship, err := s.repo.FindByID(relationshipID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("friend request not found")
		}
		return err
	}

	if relationship.RequesterID != userID {
		return errors.New("only the requester can cancel this request")
	}

	if relationship.Status != models.RelationshipStatusPending {
		return fmt.Errorf("cannot cancel request with status: %s", relationship.Status)
	}

	if err := s.repo.Delete(relationship); err != nil {
		s.logger.Errorw("Failed to cancel friend request",
			"relationship_id", relationshipID,
			"error", err.Error(),
		)
		return err
	}

	s.logger.Infow("Friend request cancelled",
		"relationship_id", relationshipID,
		"requester_id", relationship.RequesterID,
		"addressee_id", relationship.AddresseeID,
	)

	return nil
}

func (s *Service) Unfriend(relationshipID, userID uuid.UUID) error {
	relationship, err := s.repo.FindByID(relationshipID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("friendship not found")
		}
		return err
	}

	if relationship.RequesterID != userID && relationship.AddresseeID != userID {
		return errors.New("you are not part of this friendship")
	}

	if relationship.Status != models.RelationshipStatusAccepted {
		return errors.New("can only unfriend accepted friendships")
	}

	if err := s.repo.Delete(relationship); err != nil {
		s.logger.Errorw("Failed to unfriend",
			"relationship_id", relationshipID,
			"error", err.Error(),
		)
		return err
	}

	s.logger.Infow("Unfriended successfully",
		"relationship_id", relationshipID,
		"user_id", userID,
	)

	return nil
}

func (s *Service) BlockUser(blockerID, blockedID uuid.UUID) (*RelationshipResponse, error) {
	if blockerID == blockedID {
		return nil, errors.New("cannot block yourself")
	}

	existing, err := s.repo.FindByUsers(blockerID, blockedID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var relationship *models.Relationship

	if existing != nil {
		existing.RequesterID = blockerID
		existing.AddresseeID = blockedID
		existing.Status = models.RelationshipStatusBlocked
		if err := s.repo.Update(existing); err != nil {
			return nil, err
		}
		relationship = existing
	} else {
		relationship = &models.Relationship{
			RequesterID: blockerID,
			AddresseeID: blockedID,
			Status:      models.RelationshipStatusBlocked,
		}
		if err := s.repo.Create(relationship); err != nil {
			return nil, err
		}
	}

	s.logger.Infow("User blocked successfully",
		"blocker_id", blockerID,
		"blocked_id", blockedID,
	)

	relationship, _ = s.repo.FindByID(relationship.ID)
	return s.buildRelationshipResponse(relationship), nil
}

func (s *Service) UnblockUser(relationshipID, userID uuid.UUID) error {
	relationship, err := s.repo.FindByID(relationshipID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("block relationship not found")
		}
		return err
	}

	if relationship.RequesterID != userID {
		return errors.New("only the blocker can unblock this user")
	}

	if relationship.Status != models.RelationshipStatusBlocked {
		return errors.New("can only unblock blocked relationships")
	}

	if err := s.repo.Delete(relationship); err != nil {
		s.logger.Errorw("Failed to unblock user",
			"relationship_id", relationshipID,
			"error", err.Error(),
		)
		return err
	}

	s.logger.Infow("User unblocked successfully",
		"relationship_id", relationshipID,
		"blocker_id", relationship.RequesterID,
		"blocked_id", relationship.AddresseeID,
	)

	return nil
}

func (s *Service) GetPendingRequests(userID uuid.UUID, limit, offset int) (*RelationshipListResponse, error) {
	relationships, total, err := s.repo.GetPendingRequests(userID, limit, offset)
	if err != nil {
		return nil, err
	}

	responses := make([]RelationshipResponse, len(relationships))
	for i, rel := range relationships {
		responses[i] = *s.buildRelationshipResponse(&rel)
	}

	return &RelationshipListResponse{
		Relationships: responses,
		Total:         total,
		Limit:         limit,
		Offset:        offset,
	}, nil
}

func (s *Service) GetSentRequests(userID uuid.UUID, limit, offset int) (*RelationshipListResponse, error) {
	relationships, total, err := s.repo.GetSentRequests(userID, limit, offset)
	if err != nil {
		return nil, err
	}

	responses := make([]RelationshipResponse, len(relationships))
	for i, rel := range relationships {
		responses[i] = *s.buildRelationshipResponse(&rel)
	}

	return &RelationshipListResponse{
		Relationships: responses,
		Total:         total,
		Limit:         limit,
		Offset:        offset,
	}, nil
}

func (s *Service) GetFriends(userID uuid.UUID, limit, offset int) (*FriendListResponse, error) {
	relationships, total, err := s.repo.GetFriends(userID, limit, offset)
	if err != nil {
		return nil, err
	}

	friends := make([]FriendResponse, len(relationships))
	for i, rel := range relationships {
		var friend *models.User
		if rel.RequesterID == userID {
			friend = rel.Addressee
		} else {
			friend = rel.Requester
		}

		friends[i] = FriendResponse{
			ID:       friend.ID.String(),
			Username: friend.Username,
			Email:    friend.Email,
			Avatar:   friend.Avatar,
			FullName: friend.FullName,
		}

		if rel.ActionedAt != nil {
			friends[i].FriendAt = rel.ActionedAt.Format("2006-01-02T15:04:05Z07:00")
		}
	}

	return &FriendListResponse{
		Friends: friends,
		Total:   total,
		Limit:   limit,
		Offset:  offset,
	}, nil
}

func (s *Service) GetBlockedUsers(userID uuid.UUID, limit, offset int) (*RelationshipListResponse, error) {
	relationships, total, err := s.repo.GetBlockedUsers(userID, limit, offset)
	if err != nil {
		return nil, err
	}

	responses := make([]RelationshipResponse, len(relationships))
	for i, rel := range relationships {
		responses[i] = *s.buildRelationshipResponse(&rel)
	}

	return &RelationshipListResponse{
		Relationships: responses,
		Total:         total,
		Limit:         limit,
		Offset:        offset,
	}, nil
}

func (s *Service) buildRelationshipResponse(rel *models.Relationship) *RelationshipResponse {
	response := &RelationshipResponse{
		ID:          rel.ID.String(),
		RequesterID: rel.RequesterID.String(),
		AddresseeID: rel.AddresseeID.String(),
		Status:      string(rel.Status),
		CreatedAt:   rel.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if rel.ActionedAt != nil {
		response.ActionedAt = rel.ActionedAt.Format("2006-01-02T15:04:05Z07:00")
	}

	if rel.Requester != nil {
		response.Requester = &UserInfo{
			ID:       rel.Requester.ID.String(),
			Username: rel.Requester.Username,
			Email:    rel.Requester.Email,
			Avatar:   rel.Requester.Avatar,
			FullName: rel.Requester.FullName,
		}
	}

	if rel.Addressee != nil {
		response.Addressee = &UserInfo{
			ID:       rel.Addressee.ID.String(),
			Username: rel.Addressee.Username,
			Email:    rel.Addressee.Email,
			Avatar:   rel.Addressee.Avatar,
			FullName: rel.Addressee.FullName,
		}
	}

	return response
}
