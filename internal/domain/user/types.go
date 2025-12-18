package user

type OnlineEvent struct {
	UserID    string `json:"userId"`
	Timestamp string `json:"timestamp"`
}

type OfflineEvent struct {
	UserID    string `json:"userId"`
	Timestamp string `json:"timestamp"`
}

type TypingEvent struct {
	UserID         string `json:"userId"`
	ConversationID string `json:"conversationId"`
	IsTyping       bool   `json:"isTyping"`
}
