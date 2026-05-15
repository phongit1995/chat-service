package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type CallType string
type CallStatus string

const (
	CallTypeAudio CallType = "audio"
	CallTypeVideo CallType = "video"

	CallStatusRinging  CallStatus = "ringing"
	CallStatusActive   CallStatus = "active"
	CallStatusEnded    CallStatus = "ended"
	CallStatusMissed   CallStatus = "missed"
	CallStatusDeclined CallStatus = "declined"
)

type Call struct {
	ID              uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ConversationID  uuid.UUID      `gorm:"type:uuid;not null;index:idx_calls_conv_started,priority:1" json:"conversationId"`
	CallerID        uuid.UUID      `gorm:"type:uuid;not null;index" json:"callerId"`
	CallType        CallType       `gorm:"type:varchar(10);not null" json:"callType"`
	RoomName        string         `gorm:"type:varchar(255);not null;uniqueIndex" json:"roomName"`
	Status          CallStatus     `gorm:"type:varchar(20);not null;default:'ringing'" json:"status"`
	Participants    pq.StringArray `gorm:"type:uuid[];not null;default:'{}'" json:"participants"`
	StartedAt       time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP;index:idx_calls_conv_started,priority:2,sort:desc" json:"startedAt"`
	AnsweredAt      *time.Time     `json:"answeredAt,omitempty"`
	EndedAt         *time.Time     `json:"endedAt,omitempty"`
	DurationSeconds *int           `json:"durationSeconds,omitempty"`
	CreatedAt       time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"createdAt"`
	UpdatedAt       time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updatedAt"`
}

func (Call) TableName() string {
	return "calls"
}
