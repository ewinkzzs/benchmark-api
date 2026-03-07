import http from "k6/http";
import { check } from "k6";
import { Trend, Rate } from "k6/metrics";

const latency   = new Trend("request_duration");
const errorRate = new Rate("errors");

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const LIMIT    = __ENV.LIMIT    || "1000";

export const options = {
  // ✅ Matikan verbose logging
  noConnectionReuse: false,
  discardResponseBodies: false,

  // ✅ Batasi log error agar tidak flood
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],

  stages: [
    { duration: "30s",  target: 50  },
    { duration: "60s",  target: 100 },
    { duration: "30s",  target: 160 },
    { duration: "60s",  target: 160 },
    { duration: "30s",  target: 250 },
    { duration: "120s", target: 250 },
    { duration: "30s",  target: 0   },
  ],
  thresholds: {
    http_req_duration: ["p(95)<30000"],
    errors:            ["rate<0.5"],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/workorders?limit=${LIMIT}`, {
    timeout: "120s",
    headers: { "Connection": "keep-alive" },
  });

  const ok = check(res, {
    "status 200":         (r) => r.status === 200,
    "has data field":     (r) => {
      if (!r.body || r.status !== 200) return false;
      try {
        return JSON.parse(r.body).data !== undefined;
      } catch (e) {
        return false;
      }
    },
    "response time < 5s": (r) => r.timings.duration < 5000,
  });

  latency.add(res.timings.duration);
  errorRate.add(!ok);
}