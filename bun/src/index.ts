import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host:               Bun.env.DB_HOST     ?? "localhost",
  port:               Number(Bun.env.DB_PORT ?? 3306),
  user:               Bun.env.DB_USER     ?? "root",
  password:           Bun.env.DB_PASS     ?? "",
  database:           Bun.env.DB_NAME     ?? "mydb",
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  ssl:                { rejectUnauthorized: false }, // PlanetScale wajib SSL
});

type ApiResponse<T> = {
  code:   number;
  status: string;
  data:   T;
};

function json<T>(data: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 8080),

  async fetch(req) {
    const url    = new URL(req.url);
    const path   = url.pathname;
    const method = req.method;

    if (method === "GET" && path === "/workorders") {
        try {
            const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "1000"), 1), 10000);
            const [rows] = await pool.execute("SELECT * FROM service_workorder LIMIT ?", [limit]);
            return json({ code: 200, status: "success", data: rows });
        } catch (err: any) {
            return json({ code: 500, status: "error", data: err.message }, 500);
        }
    }

    if (path === "/health") {
      return json({ code: 200, status: "success", data: { status: "ok" } });
    }

    return json({ code: 404, status: "not_found", data: null }, 404);
  },
});

console.log(`🥟 Bun server running on port ${server.port}`);