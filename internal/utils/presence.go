package utils

import (
	"chat-server/internal/constants"
	"time"
)

func ApplyOnlineGrace(rawOnline bool, lastActive string) (bool, string) {
	if rawOnline {
		return true, ""
	}
	if lastActive == "" {
		return false, ""
	}
	t, err := time.Parse(time.RFC3339, lastActive)
	if err != nil {
		return false, lastActive
	}
	if time.Since(t) <= time.Duration(constants.OnlineGraceWindowSecs)*time.Second {
		return true, ""
	}
	return false, lastActive
}
