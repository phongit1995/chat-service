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
	UserIDs        []string    `json:"user_ids"`
	Timestamp      time.Time   `json:"timestamp,omitempty"`
	Data           interface{} `json:"data,omitempty"`
}

type DeletedEvent struct {
	ConversationID string   `json:"conversation_id"`
	MessageID      string   `json:"message_id"`
	UserIDs        []string `json:"user_ids"`
}

type UpdatedEvent struct {
	ConversationID string      `json:"conversation_id"`
	MessageID      string      `json:"message_id"`
	Data           interface{} `json:"data,omitempty"`
}
