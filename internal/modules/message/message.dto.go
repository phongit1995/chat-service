package message

type SendMessageRequest struct {
	ConversationID string  `json:"conversationId" validate:"required,uuid" example:"ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd"`
	Type           string  `json:"type" validate:"required,oneof=text image file video audio" example:"text"`
	Content        string  `json:"content" validate:"required,min=1" example:"Hello, how are you?"`
	Metadata       string  `json:"metadata,omitempty" example:"{\"fileName\":\"image.png\"}"`
	ReplyToID      *string `json:"replyToId,omitempty" validate:"omitempty,uuid" example:"fa7f9g87-ba3f-7a68-e2d9-ffh38d37dhge"`
}

type SendDirectMessageRequest struct {
	RecipientID string `json:"recipientId" validate:"required,uuid" example:"ca4c6d54-870c-4735-b9a6-cce05a04aedb"`
	Type        string `json:"type" validate:"required,oneof=text image file video audio" example:"text"`
	Content     string `json:"content" validate:"required,min=1" example:"Hello, how are you?"`
	Metadata    string `json:"metadata,omitempty" example:"{\"fileName\":\"image.png\"}"`
}

type UpdateMessageRequest struct {
	Content string `json:"content" validate:"required,min=1" example:"Updated message content"`
}

type MessageResponse struct {
	ID             string `json:"id" example:"fa7f9g87-ba3f-7a68-e2d9-ffh38d37dhge"`
	ConversationID string `json:"conversationId" example:"ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd"`
	SenderID       string `json:"senderId" example:"ca4c6d54-870c-4735-b9a6-cce05a04aedb"`
	SenderName     string `json:"senderName,omitempty" example:"John Doe"`
	SenderAvatar   string `json:"senderAvatar,omitempty" example:"https://example.com/avatar.jpg"`
	Type           string `json:"type" example:"text"`
	Content        string `json:"content" example:"Hello, how are you?"`
	Metadata       string `json:"metadata,omitempty" example:"{\"fileName\":\"image.png\"}"`
	Status         string `json:"status" example:"sent"`
	CreatedAt      string `json:"createdAt" example:"2024-01-15T10:30:00Z"`
	UpdatedAt      string `json:"updatedAt" example:"2024-01-15T10:30:00Z"`
	ReplyToID      string `json:"replyToId,omitempty" example:"ga8g0h98-cb4g-8b79-f3e0-ggi49e48eihf"`
}

type MessagesListResponse struct {
	Messages []MessageResponse `json:"messages"`
	Total    int               `json:"total" example:"50"`
}

type MessageSuccessResponse struct {
	Success bool             `json:"success" example:"true"`
	Message string           `json:"message" example:"Message sent successfully"`
	Data    *MessageResponse `json:"data"`
}

type MessagesListSuccessResponse struct {
	Success bool                  `json:"success" example:"true"`
	Message string                `json:"message" example:"Messages retrieved successfully"`
	Data    *MessagesListResponse `json:"data"`
}

type SimpleSuccessResponse struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"Operation completed successfully"`
}
