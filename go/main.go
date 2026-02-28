package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// ─── Models ───────────────────────────────────────────────────────────────────

type ApiResponse struct {
	Code   int    `json:"code"`
	Status string `json:"status"`
	Data   any    `json:"data"`
}

// ─── DB ───────────────────────────────────────────────────────────────────────

var db *sql.DB

func initDB() {
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "3306")
	user := getEnv("DB_USER", "root")
	pass := getEnv("DB_PASS", "")
	dbname := getEnv("DB_NAME", "mydb")

	// PlanetScale: tambahkan ?tls=true&interpolateParams=true
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?parseTime=true&interpolateParams=true",
		user, pass, host, port, dbname,
	)

	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("failed to open db: %v", err)
	}

	// Connection pool tuning
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err = db.Ping(); err != nil {
		log.Fatalf("failed to ping db: %v", err)
	}
	log.Println("✅ Database connected")
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func writeJSON(w http.ResponseWriter, code int, status string, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(ApiResponse{
		Code:   code,
		Status: status,
		Data:   data,
	})
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

func handleWorkorders(w http.ResponseWriter, r *http.Request) {
	rows, err := db.QueryContext(r.Context(), "SELECT * FROM service_workorder")
	if err != nil {
		writeJSON(w, 500, "error", err.Error())
		return
	}
	defer rows.Close()

	// Ambil column names secara dinamis
	cols, err := rows.Columns()
	if err != nil {
		writeJSON(w, 500, "error", err.Error())
		return
	}

	var result []map[string]any
	for rows.Next() {
		vals := make([]any, len(cols))
		valPtr := make([]any, len(cols))
		for i := range vals {
			valPtr[i] = &vals[i]
		}
		if err := rows.Scan(valPtr...); err != nil {
			writeJSON(w, 500, "error", err.Error())
			return
		}
		row := make(map[string]any, len(cols))
		for i, col := range cols {
			b, ok := vals[i].([]byte)
			if ok {
				row[col] = string(b)
			} else {
				row[col] = vals[i]
			}
		}
		result = append(result, row)
	}

	if result == nil {
		result = []map[string]any{}
	}

	writeJSON(w, 200, "success", result)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, "success", map[string]string{"status": "ok"})
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	initDB()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /workorders", handleWorkorders)
	mux.HandleFunc("GET /health", handleHealth)

	port := getEnv("PORT", "8080")
	log.Printf("🐹 Go server running on port %s", port)

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
