package user

import "chat-server/internal/utils"

type UserProfileResponse struct {
	ID          string                 `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Username    string                 `json:"username" example:"john_doe"`
	Email       string                 `json:"email" example:"john@example.com"`
	Avatar      string                 `json:"avatar,omitempty" example:"https://example.com/avatar.jpg"`
	Phone       string                 `json:"phone,omitempty" example:"+84987654321"`
	FullName    string                 `json:"fullName,omitempty" example:"John Doe"`
	Bio         string                 `json:"bio,omitempty" example:"Software developer"`
	DateOfBirth string                 `json:"dateOfBirth,omitempty" example:"1990-01-01"`
	CustomInfo  map[string]interface{} `json:"customInfo,omitempty" swaggertype:"object" example:"{\"theme\":\"dark\",\"language\":\"en\"}"`
	CreatedAt   string                 `json:"createdAt" example:"2024-01-01T00:00:00Z"`
	UpdatedAt   string                 `json:"updatedAt" example:"2024-01-01T00:00:00Z"`
}

type SearchUsersQuery struct {
	Q     string `form:"q" binding:"required,min=1,max=100"`
	Limit int    `form:"limit" binding:"omitempty,min=1,max=100"`
}

type UpdateProfileRequest struct {
	Avatar      string                 `json:"avatar,omitempty" binding:"omitempty,url,max=500" example:"https://example.com/avatar.jpg"`
	Phone       string                 `json:"phone,omitempty" binding:"omitempty,max=20" example:"+84987654321"`
	FullName    string                 `json:"fullName,omitempty" binding:"omitempty,max=100" example:"John Doe"`
	Bio         string                 `json:"bio,omitempty" binding:"omitempty,max=500" example:"Software developer"`
	DateOfBirth string                 `json:"dateOfBirth,omitempty" binding:"omitempty,datetime=2006-01-02" example:"1990-01-01"`
	CustomInfo  map[string]interface{} `json:"customInfo,omitempty" swaggertype:"object"`
}

type UserSearchResult struct {
	ID       string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Username string `json:"username" example:"john_doe"`
	FullName string `json:"fullName,omitempty" example:"John Doe"`
	Avatar   string `json:"avatar,omitempty" example:"https://example.com/avatar.jpg"`
	Bio      string `json:"bio,omitempty" example:"Software developer"`
	IsOnline bool   `json:"isOnline" example:"true"`
}

type SearchUsersResponse struct {
	Users []UserSearchResult `json:"users"`
	Total int                `json:"total" example:"5"`
}

type UploadAvatarResponse struct {
	URL       string `json:"url" example:"http://localhost:9000/chat-uploads/uploads/abc123.webp"`
	SecureURL string `json:"secureUrl" example:"http://localhost:9000/chat-uploads/uploads/abc123.webp"`
	PublicID  string `json:"publicId" example:"uploads/abc123.webp"`
	Format    string `json:"format" example:"webp"`
	Width     int    `json:"width" example:"0"`
	Height    int    `json:"height" example:"0"`
}

type UserPublicProfileResponse struct {
	ID           string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Username     string `json:"username" example:"john_doe"`
	FullName     string `json:"fullName,omitempty" example:"John Doe"`
	Avatar       string `json:"avatar,omitempty" example:"https://example.com/avatar.jpg"`
	Bio          string `json:"bio,omitempty" example:"Software developer"`
	IsOnline     bool   `json:"isOnline" example:"true"`
	LastActiveAt string `json:"lastActiveAt,omitempty" example:"2024-01-15T10:30:00Z"`
	CreatedAt    string `json:"createdAt" example:"2024-01-01T00:00:00Z"`
}

type PresenceBatchRequest struct {
	UserIds []string `json:"userIds" binding:"required,min=1,max=200,dive,uuid" example:"550e8400-e29b-41d4-a716-446655440000"`
}

type UserPresence struct {
	UserID       string `json:"userId" example:"550e8400-e29b-41d4-a716-446655440000"`
	IsOnline     bool   `json:"isOnline" example:"true"`
	LastActiveAt string `json:"lastActiveAt,omitempty" example:"2024-01-15T10:30:00Z"`
}

type PresenceBatchResponse struct {
	Users []UserPresence `json:"users"`
}

type PresenceBatchSuccessResponse = utils.BaseResponse[PresenceBatchResponse]

type UserPublicProfileSuccessResponse = utils.BaseResponse[UserPublicProfileResponse]

type UserProfileSuccessResponse = utils.BaseResponse[UserProfileResponse]
type SearchUsersSuccessResponse = utils.BaseResponse[SearchUsersResponse]
type UploadAvatarSuccessResponse = utils.BaseResponse[UploadAvatarResponse]
