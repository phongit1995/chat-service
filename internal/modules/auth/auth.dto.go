package auth

import "chat-server/internal/utils"

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50" example:"john_doe"`
	Email    string `json:"email" binding:"required,email" example:"john@example.com"`
	Password string `json:"password" binding:"required,min=6" example:"password123"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email" example:"john@example.com"`
	Password string `json:"password" binding:"required" example:"password123"`
}

type AuthResponse struct {
	Token        string       `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	RefreshToken string       `json:"refreshToken" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	User         UserResponse `json:"user"`
}

type UserResponse struct {
	ID          string                 `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Username    string                 `json:"username" example:"john_doe"`
	Email       string                 `json:"email" example:"john@example.com"`
	Avatar      string                 `json:"avatar,omitempty" example:"https://example.com/avatar.jpg"`
	Phone       string                 `json:"phone,omitempty" example:"+84987654321"`
	FullName    string                 `json:"fullName,omitempty" example:"John Doe"`
	Bio         string                 `json:"bio,omitempty" example:"Software developer"`
	DateOfBirth string                 `json:"dateOfBirth,omitempty" example:"1990-01-01"`
	CustomInfo  map[string]interface{} `json:"customInfo,omitempty" swaggertype:"object" example:"{\"theme\":\"dark\",\"language\":\"en\"}"`
}

type AuthSuccessResponse = utils.BaseResponse[AuthResponse]
