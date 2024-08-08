package utils

import "time"

func ConvertHHMMSS(t time.Time) string {
	return t.Format("15:04:05") // このレイアウトって具体的で良いらしい
}

func ConvertYYYYMMDDHHMMSS(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}
