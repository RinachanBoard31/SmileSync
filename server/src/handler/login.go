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

	loginPassword := os.Getenv("LOGIN_PASSWORD")
	if creds["password"] != loginPassword {
		http.Error(w, "Invalid password", http.StatusUnauthorized)
		return
	}
	w.WriteHeader(http.StatusOK)
}
