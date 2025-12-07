package utils

import (
	"github.com/gocql/gocql"
	"github.com/google/uuid"
)

func ToGocqlUUID(googleUUID uuid.UUID) (gocql.UUID, error) {
	return gocql.ParseUUID(googleUUID.String())
}

func ToGocqlUUIDPtr(googleUUID *uuid.UUID) (*gocql.UUID, error) {
	if googleUUID == nil {
		return nil, nil
	}
	gocqlUUID, err := gocql.ParseUUID(googleUUID.String())
	if err != nil {
		return nil, err
	}
	return &gocqlUUID, nil
}

func ToGoogleUUID(gocqlUUID gocql.UUID) (uuid.UUID, error) {
	return uuid.Parse(gocqlUUID.String())
}

func ToGoogleUUIDPtr(gocqlUUID *gocql.UUID) (*uuid.UUID, error) {
	if gocqlUUID == nil {
		return nil, nil
	}
	googleUUID, err := uuid.Parse(gocqlUUID.String())
	if err != nil {
		return nil, err
	}
	return &googleUUID, nil
}
