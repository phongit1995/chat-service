package user

import (
	"chat-server/internal/models"
	"errors"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type Service struct {
	repo   *Repository
	cache  *CacheService
	logger *zap.SugaredLogger
}

func NewService(repo *Repository, cache *CacheService, logger *zap.SugaredLogger) *Service {
	return &Service{
		repo:   repo,
		cache:  cache,
		logger: logger.Named("[user_service]"),
	}
}

func (s *Service) GetProfile(userID uuid.UUID) (*UserProfileResponse, error) {
	s.logger.Debugw("Fetching user profile",
		"user_id", userID,
	)

	cachedUser, err := s.cache.GetUser(userID)
	if err == nil {
		s.logger.Debugw("User profile fetched from cache",
			"user_id", userID,
			"username", cachedUser.Username,
		)
		return s.buildProfileResponse(cachedUser), nil
	}

	s.logger.Debugw("Cache miss, fetching from database",
		"user_id", userID,
	)

	user, err := s.repo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.logger.Warnw("User not found",
				"user_id", userID,
			)
			return nil, errors.New("user not found")
		}
		s.logger.Errorw("Database error while fetching user",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, err
	}

	if err := s.cache.SetUser(user.ID, user); err != nil {
		s.logger.Warnw("Failed to cache user profile",
			"user_id", userID,
			"error", err.Error(),
		)
	}

	s.logger.Debugw("User profile fetched successfully",
		"user_id", userID,
		"username", user.Username,
	)

	return s.buildProfileResponse(user), nil
}

func (s *Service) UpdateProfile(userID uuid.UUID, req *UpdateProfileRequest) (*UserProfileResponse, error) {
	s.logger.Debugw("Updating user profile",
		"user_id", userID,
	)

	user, err := s.repo.FindByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.logger.Warnw("User not found",
				"user_id", userID,
			)
			return nil, errors.New("user not found")
		}
		s.logger.Errorw("Database error while fetching user",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, err
	}

	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Bio != "" {
		user.Bio = req.Bio
	}
	if req.DateOfBirth != "" {
		dob, err := time.Parse("2006-01-02", req.DateOfBirth)
		if err != nil {
			s.logger.Warnw("Invalid date format",
				"user_id", userID,
				"date", req.DateOfBirth,
			)
			return nil, errors.New("invalid date format, use YYYY-MM-DD")
		}
		user.DateOfBirth = &dob
	}
	if req.CustomInfo != nil {
		user.CustomInfo = models.JSONB(req.CustomInfo)
	}

	if err := s.repo.Update(user); err != nil {
		s.logger.Errorw("Failed to update user profile",
			"user_id", userID,
			"error", err.Error(),
		)
		return nil, err
	}

	if err := s.cache.InvalidateUser(user.ID); err != nil {
		s.logger.Warnw("Failed to invalidate user cache",
			"user_id", userID,
			"error", err.Error(),
		)
	}

	if err := s.cache.SetUser(user.ID, user); err != nil {
		s.logger.Warnw("Failed to update user cache",
			"user_id", userID,
			"error", err.Error(),
		)
	}

	s.logger.Infow("User profile updated successfully",
		"user_id", userID,
		"username", user.Username,
	)

	return s.buildProfileResponse(user), nil
}

func (s *Service) SearchUsers(query string, limit int, currentUserID uuid.UUID) (*SearchUsersResponse, error) {
	s.logger.Debugw("Searching users",
		"query", query,
		"limit", limit,
		"current_user_id", currentUserID,
	)

	if query == "" {
		return &SearchUsersResponse{Users: []UserSearchResult{}, Total: 0}, nil
	}

	if limit <= 0 || limit > 50 {
		limit = 20
	}

	users, err := s.repo.Search(query, limit, &currentUserID)
	if err != nil {
		s.logger.Errorw("Failed to search users",
			"query", query,
			"error", err.Error(),
		)
		return nil, err
	}

	results := make([]UserSearchResult, 0, len(users))
	for _, user := range users {
		results = append(results, UserSearchResult{
			ID:       user.ID.String(),
			Username: user.Username,
			Email:    user.Email,
			FullName: user.FullName,
			Avatar:   user.Avatar,
			Bio:      user.Bio,
		})
	}

	s.logger.Debugw("User search completed",
		"query", query,
		"results_count", len(results),
	)

	return &SearchUsersResponse{
		Users: results,
		Total: len(results),
	}, nil
}

func (s *Service) buildProfileResponse(user *models.User) *UserProfileResponse {
	response := &UserProfileResponse{
		ID:         user.ID.String(),
		Username:   user.Username,
		Email:      user.Email,
		Avatar:     user.Avatar,
		Phone:      user.Phone,
		FullName:   user.FullName,
		Bio:        user.Bio,
		CustomInfo: user.CustomInfo,
	}

	if user.DateOfBirth != nil {
		response.DateOfBirth = user.DateOfBirth.Format("2006-01-02")
	}

	return response
}
