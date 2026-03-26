import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host:               Bun.env.DB_HOST ?? "localhost",
  port:               Number(Bun.env.DB_PORT ?? 3306),
  user:               Bun.env.DB_USER ?? "root",
  password:           Bun.env.DB_PASS ?? "",
  database:           Bun.env.DB_NAME ?? "mydb",
  waitForConnections: true,
  connectionLimit:    25,        // sama dengan Go (MaxOpenConns: 25)
  queueLimit:         0,
  ssl:                { rejectUnauthorized: false },
});

type ApiResponse<T> = {
  code:   number;
  status: string;
  data:   T;
};

// ✅ Pakai Buffer — 1x alokasi saja, setara Go & PHP
function json<T>(data: ApiResponse<T>, status = 200): Response {
  const buf = Buffer.from(JSON.stringify(data));
  return new Response(buf, {
    status,
    headers: {
      "Content-Type":  "application/json",
      "Content-Length": String(buf.byteLength),
    },
  });
}

const server = Bun.serve({
  port:        Number(Bun.env.PORT ?? 8080),
  idleTimeout: 120,

  async fetch(req) {
    const url    = new URL(req.url);
    const path   = url.pathname;
    const method = req.method;

    // ─── GET /workorders ────────────────────────────────────────────────────
    if (method === "GET" && path === "/workorders") {
      try {
        const limit = Math.min(
          Math.max(parseInt(url.searchParams.get("limit") ?? "1000"), 1),
          10000
        );

        // ✅ Query identik dengan Go & PHP
        const [rows] = await pool.query(
          `SELECT
            service_workorder.Oid, 
            service_workorder.WorkOrderNo, 
            service_workorder.WorkOrderDate, 
            service_workorder.CancelDate, 
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
            service_workorder.TotalJobDiscount, 
            service_workorder.TotalJobProgram, 
            service_workorder.TotalJobVAT, 
            service_workorder.TotalJobWithholdingTax, 
            service_workorder.TotalJob, 
            service_workorder.PDI
          FROM service_workorder LIMIT ${limit}`
        );

        return json({ code: 200, status: "success", data: rows });

      } catch (err: any) {
        return json({ code: 500, status: "error", data: err.message }, 500);
      }
    }

    // ─── GET /health ─────────────────────────────────────────────────────────
    if (path === "/health") {
      return json({ code: 200, status: "success", data: { status: "ok" } });
    }

    return json({ code: 404, status: "not_found", data: null }, 404);
  },
});

console.log(`🥟 Bun server running on port ${server.port}`);