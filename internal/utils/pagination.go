package utils

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

func ParseLimit(c *gin.Context, defaultLimit, maxLimit int) int {
	limit := defaultLimit
	if s := c.Query("limit"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			limit = n
		}
	}
	if maxLimit > 0 && limit > maxLimit {
		limit = maxLimit
	}
	return limit
}
