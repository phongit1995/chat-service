package relationships

import "chat-server/internal/utils"

type SendFriendRequestRequest struct {
	AddresseeID string `json:"addresseeId" binding:"required" example:"550e8400-e29b-41d4-a716-446655440001"`
}

type BlockUserRequest struct {
	UserID string `json:"userId" binding:"required" example:"550e8400-e29b-41d4-a716-446655440001"`
}

type RespondToRequestRequest struct {
	Action string `json:"action" binding:"required,oneof=accept reject" example:"accept"`
}

type UserInfo struct {
	ID       string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Username string `json:"username" example:"john_doe"`
	Email    string `json:"email" example:"john@example.com"`
	Avatar   string `json:"avatar,omitempty" example:"https://example.com/avatar.jpg"`
	FullName string `json:"fullName,omitempty" example:"John Doe"`
}

type RelationshipResponse struct {
	ID          string    `json:"id" example:"550e8400-e29b-41d4-a716-446655440002"`
	RequesterID string    `json:"requesterId" example:"550e8400-e29b-41d4-a716-446655440000"`
	AddresseeID string    `json:"addresseeId" example:"550e8400-e29b-41d4-a716-446655440001"`
	Status      string    `json:"status" example:"pending"`
	ActionedAt  string    `json:"actionedAt,omitempty" example:"2024-01-15T10:30:00Z"`
	CreatedAt   string    `json:"createdAt" example:"2024-01-15T10:30:00Z"`
	Requester   *UserInfo `json:"requester,omitempty"`
	Addressee   *UserInfo `json:"addressee,omitempty"`
}

type FriendResponse struct {
	ID       string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Username string `json:"username" example:"john_doe"`
	Email    string `json:"email" example:"john@example.com"`
	Avatar   string `json:"avatar,omitempty" example:"https://example.com/avatar.jpg"`
	FullName string `json:"fullName,omitempty" example:"John Doe"`
	FriendAt string `json:"friendAt" example:"2024-01-15T10:30:00Z"`
}

type RelationshipListResponse struct {
	Relationships []RelationshipResponse `json:"relationships"`
	Total         int                    `json:"total" example:"10"`
}

type FriendListResponse struct {
	Friends []FriendResponse `json:"friends"`
	Total   int              `json:"total" example:"5"`
}

type RelationshipSuccessResponse = utils.BaseResponse[RelationshipResponse]
type RelationshipListSuccessResponse = utils.BaseResponse[RelationshipListResponse]
type FriendListSuccessResponse = utils.BaseResponse[FriendListResponse]
