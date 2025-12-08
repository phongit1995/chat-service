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
}

type UpdateProfileRequest struct {
	Avatar      string                 `json:"avatar,omitempty" example:"https://example.com/avatar.jpg"`
	Phone       string                 `json:"phone,omitempty" example:"+84987654321"`
	FullName    string                 `json:"fullName,omitempty" example:"John Doe"`
	Bio         string                 `json:"bio,omitempty" example:"Software developer"`
	DateOfBirth string                 `json:"dateOfBirth,omitempty" example:"1990-01-01"`
	CustomInfo  map[string]interface{} `json:"customInfo,omitempty" swaggertype:"object" example:"{\"theme\":\"dark\",\"language\":\"en\"}"`
}

type UserSearchResult struct {
	ID       string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Username string `json:"username" example:"john_doe"`
	Email    string `json:"email" example:"john@example.com"`
	FullName string `json:"fullName,omitempty" example:"John Doe"`
	Avatar   string `json:"avatar,omitempty" example:"https://example.com/avatar.jpg"`
	Bio      string `json:"bio,omitempty" example:"Software developer"`
}

type SearchUsersResponse struct {
	Users []UserSearchResult `json:"users"`
	Total int                `json:"total" example:"5"`
}

type UserProfileSuccessResponse = utils.BaseResponse[UserProfileResponse]
type SearchUsersSuccessResponse = utils.BaseResponse[SearchUsersResponse]
