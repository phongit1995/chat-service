package conversation

import "time"

type CreatedEvent struct {
	ConversationID string      `json:"conversationId"`
	Data           interface{} `json:"data,omitempty"`
}

type UpdatedEvent struct {
	ConversationID string      `json:"conversationId"`
	Data           interface{} `json:"data,omitempty"`
}

type DeletedEvent struct {
	ConversationID string `json:"conversationId"`
}

type TypingEvent struct {
	ConversationID string    `json:"conversationId"`
	UserID         string    `json:"userId"`
	Username       string    `json:"username"`
	Time           time.Time `json:"time"`
}
