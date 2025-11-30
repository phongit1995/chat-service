package conversation

type CreateDirectConversationRequest struct {
	RecipientID string `json:"recipientId" validate:"required,uuid" example:"ca4c6d54-870c-4735-b9a6-cce05a04aedb"`
}

type CreateGroupConversationRequest struct {
	Name           string   `json:"name" validate:"required,min=1,max=100" example:"Project Team"`
	ParticipantIDs []string `json:"participantIds" validate:"required,min=1,dive,uuid" example:"ca4c6d54-870c-4735-b9a6-cce05a04aedb,da5d7e65-981d-5846-c0b7-ddf16b15bfec"`
}

type ConversationResponse struct {
	ID               string `json:"id" example:"ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd"`
	Type             string `json:"type" example:"direct"`
	Name             string `json:"name,omitempty" example:"John Doe"`
	Avatar           string `json:"avatar,omitempty" example:"https://example.com/avatar.jpg"`
	CreatedAt        string `json:"createdAt" example:"2024-01-15T10:30:00Z"`
	UpdatedAt        string `json:"updatedAt" example:"2024-01-15T15:45:00Z"`
	LastMessageText  string `json:"lastMessageText,omitempty" example:"Hello, how are you?"`
	LastMessageAt    string `json:"lastMessageAt,omitempty" example:"2024-01-15T15:45:00Z"`
	ParticipantCount int    `json:"participantCount" example:"2"`
	UnreadCount      int    `json:"unreadCount" example:"5"`
	IsNew            bool   `json:"isNew,omitempty" example:"true"`
}

type ConversationsListResponse struct {
	Conversations []ConversationResponse `json:"conversations"`
	Total         int                    `json:"total" example:"10"`
}

type ConversationSuccessResponse struct {
	Success bool                  `json:"success" example:"true"`
	Message string                `json:"message" example:"Conversation created successfully"`
	Data    *ConversationResponse `json:"data"`
}

type ConversationsListSuccessResponse struct {
	Success bool                       `json:"success" example:"true"`
	Message string                     `json:"message" example:"Conversations retrieved successfully"`
	Data    *ConversationsListResponse `json:"data"`
}

type SimpleSuccessResponse struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"Operation completed successfully"`
}
