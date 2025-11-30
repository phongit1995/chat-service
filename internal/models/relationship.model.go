package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RelationshipStatus string

const (
	RelationshipStatusPending  RelationshipStatus = "pending"
	RelationshipStatusAccepted RelationshipStatus = "accepted"
	RelationshipStatusRejected RelationshipStatus = "rejected"
	RelationshipStatusBlocked  RelationshipStatus = "blocked"
)

type Relationship struct {
	BaseModel
	RequesterID uuid.UUID          `gorm:"type:uuid;not null;uniqueIndex:idx_unique_relationship,priority:1;index:idx_requester_status"`
	AddresseeID uuid.UUID          `gorm:"type:uuid;not null;uniqueIndex:idx_unique_relationship,priority:2;index:idx_addressee_status"`
	Status      RelationshipStatus `gorm:"type:varchar(20);not null;default:'pending';index:idx_requester_status;index:idx_addressee_status"`
	ActionedAt  *time.Time         `gorm:"index"`

	Requester *User `gorm:"foreignKey:RequesterID;constraint:OnDelete:CASCADE"`
	Addressee *User `gorm:"foreignKey:AddresseeID;constraint:OnDelete:CASCADE"`
}

func (Relationship) TableName() string {
	return "relationships"
}

func (r *Relationship) BeforeUpdate(tx *gorm.DB) error {
	if tx.Statement.Changed("Status") {
		now := time.Now()
		r.ActionedAt = &now
	}
	return nil
}
