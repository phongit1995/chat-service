package call

import "time"

type InvitedEvent struct {
	CallID         string    `json:"callId"`
	ConversationID string    `json:"conversationId"`
	CallerID       string    `json:"callerId"`
	CallType       string    `json:"callType"`
	RoomName       string    `json:"roomName"`
	Recipients     []string  `json:"recipients"`
	StartedAt      time.Time `json:"startedAt"`
}

type AcceptedEvent struct {
	CallID         string   `json:"callId"`
	ConversationID string   `json:"conversationId"`
	AnsweredBy     string   `json:"answeredBy"`
	Recipients     []string `json:"recipients"`
}

type DeclinedEvent struct {
	CallID         string   `json:"callId"`
	ConversationID string   `json:"conversationId"`
	DeclinedBy     string   `json:"declinedBy"`
	Recipients     []string `json:"recipients"`
}

type EndedEvent struct {
	CallID          string   `json:"callId"`
	ConversationID  string   `json:"conversationId"`
	EndedBy         string   `json:"endedBy,omitempty"`
	Status          string   `json:"status"`
	DurationSeconds int      `json:"durationSeconds"`
	Recipients      []string `json:"recipients"`
}
