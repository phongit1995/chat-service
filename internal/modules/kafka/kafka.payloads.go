package kafka

type MessageCreatedPayload struct {
	ConversationID string      `json:"conversation_id"`
	MessageID      string      `json:"message_id"`
	SenderID       string      `json:"sender_id"`
	UserIDs        []string    `json:"user_ids"`
	Data           interface{} `json:"data"`
}

type MessageDeletedPayload struct {
	ConversationID string   `json:"conversation_id"`
	MessageID      string   `json:"message_id"`
	UserIDs        []string `json:"user_ids"`
}

type MessageUpdatedPayload struct {
	ConversationID string      `json:"conversation_id"`
	MessageID      string      `json:"message_id"`
	Data           interface{} `json:"data"`
}

type ConversationCreatedPayload struct {
	ConversationID string      `json:"conversation_id"`
	UserIDs        []string    `json:"user_ids"`
	Data           interface{} `json:"data"`
}

type ConversationUpdatedPayload struct {
	ConversationID string      `json:"conversation_id"`
	UserIDs        []string    `json:"user_ids"`
	Data           interface{} `json:"data"`
}

type ConversationDeletedPayload struct {
	ConversationID string   `json:"conversation_id"`
	UserIDs        []string `json:"user_ids"`
}

type UserOnlinePayload struct {
	UserID    string `json:"user_id"`
	Timestamp string `json:"timestamp"`
}

type UserOfflinePayload struct {
	UserID    string `json:"user_id"`
	Timestamp string `json:"timestamp"`
}

type UserTypingPayload struct {
	UserID         string `json:"user_id"`
	ConversationID string `json:"conversation_id"`
	IsTyping       bool   `json:"is_typing"`
}
