package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
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
	limitStr := r.URL.Query().Get("limit")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 1000
	}
	if limit > 10000 {
		limit = 10000
	}

	rows, err := db.QueryContext(r.Context(),
		"SELECT
			service_workorder.GrossJobSales, 
			service_workorder.GrossPartSales, 
			service_workorder.TotalPartDiscount, 
			service_workorder.TotalPartProgram, 
			service_workorder.TotalPartVAT, 
			service_workorder.TotalPartWithholdingTax, 
			service_workorder.TotalJobDiscount, 
			service_workorder.TotalJobProgram, 
			service_workorder.TotalJobVAT, 
			service_workorder.TotalJobWithholdingTax, 
			service_workorder.TotalJob, 
			service_workorder.TotalPart, 
			service_workorder.TotalInvoice, 
			service_workorder.TotalPayment, 
			service_workorder.DownPayment, 
			service_workorder.Stamp, 
			service_workorder.Tax, 
			service_workorder.Oid, 
			service_workorder.WorkOrderNo, 
			service_workorder.WorkOrderDate, 
			service_workorder.CancelDate, 
			service_workorder.CancelReason, 
			service_workorder.BookingNo, 
			service_workorder.BookingStartOn, 
			service_workorder.BookingDate, 
			service_workorder.ProspectCategory, 
			service_workorder.CustomerType, 
			service_workorder.ServiceStartOn, 
			service_workorder.ServiceEndOn, 
			service_workorder.Remark, 
			service_workorder.BookingStatus, 
			service_workorder.WorkOrderStatus, 
			service_workorder.PDI, 
			service_workorder.IRC, 
			service_workorder.JobTWC, 
			service_workorder.OTH, 
			service_workorder.RTJ, 
			service_workorder.VehicleUnit, 
			service_workorder.CurrentStall, 
			service_workorder.ServiceAdvisor, 
			service_workorder.Foreman, 
			service_workorder.RepairType, 
			service_workorder.ServiceInvoice, 
			service_workorder.InvoiceDate, 
			service_workorder.StartOn, 
			service_workorder.IsApproved, 
			service_workorder.WaitingApproval, 
			service_workorder.ApprovalTo, 
			service_workorder.StatusApproval, 
			service_workorder.created_at
		FROM
			service_workorder LIMIT ?", limit)
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
