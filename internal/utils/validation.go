package utils

import (
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

func FormatValidationError(service string, err error) error {
	validationErrs, ok := err.(validator.ValidationErrors)
	if !ok {
		return err
	}

	msgs := make([]string, 0, len(validationErrs))
	for _, e := range validationErrs {
		msgs = append(msgs, formatFieldError(e))
	}

	joined := strings.Join(msgs, "; ")
	if service != "" {
		return fmt.Errorf("%s config validation failed: %s", service, joined)
	}
	return fmt.Errorf("validation failed: %s", joined)
}

func formatFieldError(e validator.FieldError) string {
	field, tag, param := e.Field(), e.Tag(), e.Param()
	switch tag {
	case "required":
		return fmt.Sprintf("'%s' is required", field)
	case "min":
		if e.Kind().String() == "slice" {
			return fmt.Sprintf("'%s' must have at least %s items", field, param)
		}
		return fmt.Sprintf("'%s' must be at least %s", field, param)
	case "max":
		return fmt.Sprintf("'%s' must be at most %s", field, param)
	case "oneof":
		return fmt.Sprintf("'%s' must be one of [%s]", field, param)
	case "email":
		return fmt.Sprintf("'%s' must be a valid email", field)
	case "url":
		return fmt.Sprintf("'%s' must be a valid URL", field)
	case "uuid":
		return fmt.Sprintf("'%s' must be a valid UUID", field)
	default:
		return fmt.Sprintf("'%s' failed validation '%s'", field, tag)
	}
}
