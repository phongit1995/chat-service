package message

import "time"

type CreatedEvent struct {
	ConversationID string      `json:"conversation_id"`
	MessageID      string      `json:"message_id"`
	SenderID       string      `json:"sender_id"`
	SenderName     string      `json:"sender_name,omitempty"`
	SenderAvatar   string      `json:"sender_avatar,omitempty"`
	Content        string      `json:"content,omitempty"`
	MessageType    string      `json:"message_type,omitempty"`
	Timestamp      time.Time   `json:"timestamp,omitempty"`
	Data           interface{} `json:"data,omitempty"`
}

type DeletedEvent struct {
	ConversationID string `json:"conversation_id"`
	MessageID      string `json:"message_id"`
}

type UpdatedEvent struct {
	ConversationID string      `json:"conversation_id"`
	MessageID      string      `json:"message_id"`
	Data           interface{} `json:"data,omitempty"`
}
