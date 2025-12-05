package conversation

type CreatedEvent struct {
	ConversationID string      `json:"conversation_id"`
	UserIDs        []string    `json:"user_ids"`
	Data           interface{} `json:"data,omitempty"`
}

type UpdatedEvent struct {
	ConversationID string      `json:"conversation_id"`
	UserIDs        []string    `json:"user_ids"`
	Data           interface{} `json:"data,omitempty"`
}

type DeletedEvent struct {
	ConversationID string   `json:"conversation_id"`
	UserIDs        []string `json:"user_ids"`
}
