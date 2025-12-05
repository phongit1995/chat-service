package user

type OnlineEvent struct {
	UserID    string `json:"user_id"`
	Timestamp string `json:"timestamp"`
}

type OfflineEvent struct {
	UserID    string `json:"user_id"`
	Timestamp string `json:"timestamp"`
}

type TypingEvent struct {
	UserID         string `json:"user_id"`
	ConversationID string `json:"conversation_id"`
	IsTyping       bool   `json:"is_typing"`
}
