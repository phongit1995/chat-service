package message

import "chat-server/internal/utils"

type SendMessageRequest struct {
	ConversationID string  `json:"conversationId" binding:"required,uuid" example:"ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd"`
	Type           string  `json:"type" binding:"required,oneof=text image file video audio" example:"text"`
	Content        string  `json:"content" binding:"max=4000" example:"Hello, how are you?"`
	Metadata       string  `json:"metadata,omitempty" example:"{\"fileName\":\"image.png\"}"`
	ReplyToID      *string `json:"replyToId,omitempty" binding:"omitempty,uuid" example:"fa7f9g87-ba3f-7a68-e2d9-ffh38d37dhge"`
	ClientMsgID    string  `json:"clientMsgId,omitempty" binding:"omitempty,max=64" example:"550e8400-e29b-41d4-a716-446655440000"`
}

type SendDirectMessageRequest struct {
	RecipientID string `json:"recipientId" binding:"required,uuid" example:"ca4c6d54-870c-4735-b9a6-cce05a04aedb"`
	Type        string `json:"type" binding:"required,oneof=text image file video audio" example:"text"`
	Content     string `json:"content" binding:"max=4000" example:"Hello, how are you?"`
	Metadata    string `json:"metadata,omitempty" example:"{\"fileName\":\"image.png\"}"`
	ClientMsgID string `json:"clientMsgId,omitempty" binding:"omitempty,max=64" example:"550e8400-e29b-41d4-a716-446655440000"`
}

type UpdateMessageRequest struct {
	Content string `json:"content" binding:"required,min=1,max=4000" example:"Updated message content"`
}

type MessageResponse struct {
	ID             string              `json:"id" example:"fa7f9g87-ba3f-7a68-e2d9-ffh38d37dhge"`
	ConversationID string              `json:"conversationId" example:"ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd"`
	SenderID       string              `json:"senderId" example:"ca4c6d54-870c-4735-b9a6-cce05a04aedb"`
	SenderName     string              `json:"senderName,omitempty" example:"John Doe"`
	SenderAvatar   string              `json:"senderAvatar,omitempty" example:"https://example.com/avatar.jpg"`
	Type           string              `json:"type" example:"text"`
	Content        string              `json:"content" example:"Hello, how are you?"`
	Metadata       string              `json:"metadata,omitempty" example:"{\"fileName\":\"image.png\"}"`
	Status         string              `json:"status" example:"sent"`
	CreatedAt      string              `json:"createdAt" example:"2024-01-15T10:30:00Z"`
	UpdatedAt      string              `json:"updatedAt" example:"2024-01-15T10:30:00Z"`
	EditedAt       string              `json:"editedAt,omitempty" example:"2024-01-15T10:35:00Z"`
	ReplyToID      string              `json:"replyToId,omitempty" example:"ga8g0h98-cb4g-8b79-f3e0-ggi49e48eihf"`
	ClientMsgID    string              `json:"clientMsgId,omitempty" example:"550e8400-e29b-41d4-a716-446655440000"`
	Reactions      map[string][]string `json:"reactions,omitempty"`
}

type ToggleReactionRequest struct {
	Type string `json:"type" binding:"required,oneof=LIKE LOVE HAHA WOW SAD ANGRY" example:"LIKE"`
}

type MessagesListResponse struct {
	Messages []MessageResponse `json:"messages"`
	Total    int               `json:"total" example:"50"`
}

type SimpleSuccessResponse struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"Operation completed successfully"`
}

type ImageMetadata struct {
	URL      string `json:"url"`
	MimeType string `json:"mimeType"`
	Size     int64  `json:"size"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	FileName string `json:"fileName,omitempty"`
}

type MessageSuccessResponse = utils.BaseResponse[MessageResponse]
type MessagesListSuccessResponse = utils.BaseResponse[MessagesListResponse]
