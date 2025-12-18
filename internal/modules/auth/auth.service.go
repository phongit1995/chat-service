package auth

import (
	"chat-server/internal/models"
	"chat-server/internal/modules/user"
	"chat-server/internal/services"
	"errors"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Service struct {
	repo       *Repository
	jwtService *services.JWTService
	userCache  *user.CacheService
	logger     *zap.SugaredLogger
}

func NewService(repo *Repository, jwtService *services.JWTService, userCache *user.CacheService, logger *zap.SugaredLogger) *Service {
	return &Service{
		repo:       repo,
		jwtService: jwtService,
		userCache:  userCache,
		logger:     logger.Named("[auth_service]"),
	}
}

func (s *Service) Register(req *RegisterRequest) (*RegisterResponse, error) {
	s.logger.Debugw("Checking email availability",
		"email", req.Email,
	)

	_, err := s.repo.FindByEmail(req.Email)
	if err == nil {
		s.logger.Warnw("Email already exists",
			"email", req.Email,
		)
		return nil, errors.New("email already exists")
	}

	s.logger.Debugw("Checking username availability",
		"username", req.Username,
	)

	_, err = s.repo.FindByUsername(req.Username)
	if err == nil {
		s.logger.Warnw("Username already exists",
			"username", req.Username,
		)
		return nil, errors.New("username already exists")
	}

	s.logger.Debugw("Hashing password")

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		s.logger.Errorw("Failed to hash password",
			"error", err.Error(),
		)
		return nil, err
	}

	user := &models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	s.logger.Debugw("Creating user in database",
		"email", req.Email,
		"username", req.Username,
	)

	if err := s.repo.Create(user); err != nil {
		s.logger.Errorw("Failed to create user",
			"error", err.Error(),
		)
		return nil, err
	}

	if err := s.userCache.SetUser(user.ID, user); err != nil {
		s.logger.Warnw("Failed to cache user after registration",
			"user_id", user.ID,
			"error", err.Error(),
		)
	}

	s.logger.Infow("User registered successfully",
		"user_id", user.ID,
		"email", user.Email,
	)

	return &RegisterResponse{
		User: UserResponse{
			ID:       user.ID.String(),
			Username: user.Username,
			Email:    user.Email,
		},
		Message: "Registration successful. Please login to continue.",
	}, nil
}

func (s *Service) Login(req *LoginRequest, clientIP string) (*AuthResponse, error) {
	s.logger.Debugw("Finding user by email",
		"email", req.Email,
	)

	user, err := s.repo.FindByEmail(req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.logger.Warnw("User not found",
				"email", req.Email,
			)
			return nil, errors.New("invalid email or password")
		}
		s.logger.Errorw("Database error while finding user",
			"email", req.Email,
			"error", err.Error(),
		)
		return nil, err
	}

	s.logger.Debugw("Verifying password",
		"user_id", user.ID,
	)

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		s.logger.Warnw("Invalid password",
			"user_id", user.ID,
			"email", req.Email,
		)
		return nil, errors.New("invalid email or password")
	}

	s.logger.Debugw("Generating JWT tokens",
		"user_id", user.ID,
	)

	token, err := s.jwtService.GenerateToken(user.ID)
	if err != nil {
		s.logger.Errorw("Failed to generate access token",
			"user_id", user.ID,
			"error", err.Error(),
		)
		return nil, err
	}

	refreshToken, err := s.jwtService.GenerateRefreshToken(user.ID)
	if err != nil {
		s.logger.Errorw("Failed to generate refresh token",
			"user_id", user.ID,
			"error", err.Error(),
		)
		return nil, err
	}

	s.logger.Debugw("Updating user login info",
		"user_id", user.ID,
		"ip", clientIP,
	)

	if err := s.repo.UpdateLoginInfo(user.ID, clientIP, refreshToken); err != nil {
		s.logger.Errorw("Failed to update login info",
			"user_id", user.ID,
			"error", err.Error(),
		)
	}

	user, _ = s.repo.FindByID(user.ID)

	if err := s.userCache.SetUser(user.ID, user); err != nil {
		s.logger.Warnw("Failed to cache user after login",
			"user_id", user.ID,
			"error", err.Error(),
		)
	}

	if err := s.userCache.SetUserOnlineStatus(user.ID, true); err != nil {
		s.logger.Warnw("Failed to set user online status",
			"user_id", user.ID,
			"error", err.Error(),
		)
	}

	s.logger.Infow("User logged in successfully",
		"user_id", user.ID,
		"email", user.Email,
		"ip", clientIP,
	)

	return s.buildAuthResponse(user, token, refreshToken), nil
}

func (s *Service) buildAuthResponse(user *models.User, token, refreshToken string) *AuthResponse {
	userResponse := UserResponse{
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
		userResponse.DateOfBirth = user.DateOfBirth.Format("2006-01-02")
	}

	return &AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         userResponse,
	}
}
