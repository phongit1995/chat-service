package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to unmarshal JSONB value")
	}
	return json.Unmarshal(bytes, j)
}

type User struct {
	BaseModel
	Username     string     `gorm:"unique;not null"`
	Email        string     `gorm:"unique;not null"`
	Password     string     `gorm:"not null"`
	Avatar       string     `gorm:"type:varchar(500)"`
	Phone        string     `gorm:"type:varchar(20)"`
	FullName     string     `gorm:"type:varchar(100)"`
	Bio          string     `gorm:"type:text"`
	DateOfBirth  *time.Time `gorm:"type:date"`
	CustomInfo   JSONB      `gorm:"type:jsonb"`
	RefreshToken string     `gorm:"type:text"`
	LastLoginIP  string     `gorm:"type:varchar(45)"`
	LastLoginAt  *time.Time
}
