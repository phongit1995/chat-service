package message

import (
	"errors"
	"net/http"
)

var (
	ErrFileTooLarge       = errors.New("file too large")
	ErrRateLimit          = errors.New("upload rate limit exceeded")
	ErrNotMember          = errors.New("user is not a member of this conversation")
	ErrUnsupportedImage   = errors.New("unsupported image type")
	ErrDecodeImage        = errors.New("failed to decode image")
	ErrInvalidMetadata    = errors.New("invalid image metadata")
)

func httpStatusForError(err error) int {
	switch {
	case errors.Is(err, ErrFileTooLarge):
		return http.StatusRequestEntityTooLarge
	case errors.Is(err, ErrRateLimit):
		return http.StatusTooManyRequests
	case errors.Is(err, ErrNotMember):
		return http.StatusForbidden
	case errors.Is(err, ErrUnsupportedImage), errors.Is(err, ErrDecodeImage), errors.Is(err, ErrInvalidMetadata):
		return http.StatusBadRequest
	}
	return http.StatusInternalServerError
}
