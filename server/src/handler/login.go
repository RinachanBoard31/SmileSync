package handler

import (
	"encoding/json"
	"net/http"
	"os"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var creds map[string]string
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
	}

	adminNickname := os.Getenv("ADMIN_NICKNAME")
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	loginPassword := os.Getenv("LOGIN_PASSWORD")

	if creds["nickname"] == adminNickname {
		// 管理者の場合はADMIN_PASSWORD
		if creds["password"] != adminPassword {
			http.Error(w, "Invalid password for Admin", http.StatusUnauthorized)
			return
		}
	} else {
		// 一般ユーザの場合はLOGIN_PASSWORD
		if creds["password"] != loginPassword {
			http.Error(w, "Invalid password", http.StatusUnauthorized)
			return
		}
	}
	w.WriteHeader(http.StatusOK)
}
