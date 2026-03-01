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
            const [rows] = await pool.execute(`SELECT
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
                                                service_workorder LIMIT ${limit}`);
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