package utils

import "time"

func NowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func NowISONano() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}
