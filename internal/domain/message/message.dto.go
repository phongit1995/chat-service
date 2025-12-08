package message

import "time"

// MessageData contains the message and conversation information for events
type MessageData struct {
	ID             string `json:"id"`
	ConversationID string `json:"conversationId"`
	SenderID       string `json:"senderId"`
	SenderName     string `json:"senderName,omitempty"`
	SenderAvatar   string `json:"senderAvatar,omitempty"`
	Type           string `json:"type"`
	Content        string `json:"content"`
	Metadata       string `json:"metadata,omitempty"`
	Status         string `json:"status"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
	ReplyToID      string `json:"replyToId,omitempty"`
}

// ConversationData contains conversation information for events
type ConversationData struct {
	ID               string `json:"id"`
	Type             string `json:"type"`
	Name             string `json:"name,omitempty"`
	Avatar           string `json:"avatar,omitempty"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
	LastMessageText  string `json:"lastMessageText,omitempty"`
	LastMessageAt    string `json:"lastMessageAt,omitempty"`
	ParticipantCount int    `json:"participantCount"`
	UnreadCount      int    `json:"unreadCount"`
}

// ConversationMemberData contains conversation member information for events
type ConversationMemberData struct {
	UserID         string `json:"userId"`
	ConversationID string `json:"conversationId"`
	JoinedAt       string `json:"joinedAt"`
	LeftAt         string `json:"leftAt,omitempty"`
	IsActive       bool   `json:"isActive"`
	Role           string `json:"role"`
}

// MessageCreatedEvent represents a message creation event
type MessageCreatedEvent struct {
	Timestamp           time.Time                 `json:"timestamp,omitempty"`
	Message             *MessageData              `json:"message,omitempty"`
	Conversation        *ConversationData         `json:"conversation,omitempty"`
	ConversationMembers []*ConversationMemberData `json:"conversationMembers,omitempty"`
}

// MessageDeletedEvent represents a message deletion event
type MessageDeletedEvent struct {
	ConversationID string `json:"conversation_id"`
	MessageID      string `json:"message_id"`
}

// MessageUpdatedEvent represents a message update event
type MessageUpdatedEvent struct {
	Message             *MessageData              `json:"message,omitempty"`
	Conversation        *ConversationData         `json:"conversation,omitempty"`
	ConversationMembers []*ConversationMemberData `json:"conversationMembers,omitempty"`
}
