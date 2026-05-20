package message

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
	EditedAt       string `json:"editedAt,omitempty"`
	ReplyToID      string `json:"replyToId,omitempty"`
	ClientMsgID    string `json:"clientMsgId,omitempty"`
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
	Conversation *ConversationData `json:"conversation"`
	Message      *MessageData      `json:"message"`
}

// MessageDeletedEvent represents a message deletion event
type MessageDeletedEvent struct {
	Conversation *ConversationData `json:"conversation"`
	MessageID    string            `json:"messageId"`
}

// MessageUpdatedEvent represents a message update event
type MessageUpdatedEvent struct {
	Conversation *ConversationData `json:"conversation"`
	Message      *MessageData      `json:"message"`
}

// MessageReactionUpdatedEvent — reaction toggle event broadcast over Kafka
type MessageReactionUpdatedEvent struct {
	ConversationID string              `json:"conversationId"`
	MessageID      string              `json:"messageId"`
	Reactions      map[string][]string `json:"reactions"`
	ActorUserID    string              `json:"actorUserId"`
	Type           string              `json:"type"`
	Action         string              `json:"action"`
}
