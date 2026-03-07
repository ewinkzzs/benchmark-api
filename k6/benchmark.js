import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const latency   = new Trend("request_duration");
const errorRate = new Rate("errors");

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const LIMIT    = __ENV.LIMIT    || "1000";

export const options = {
  stages: [
    { duration: "30s",  target: 50  }, // ramp up
    { duration: "60s",  target: 100 }, // steady ringan
    { duration: "30s",  target: 160 }, // naik sedang
    { duration: "60s",  target: 160 }, // steady sedang ← tambahkan ini
    { duration: "30s",  target: 250 }, // naik ke puncak
    { duration: "120s", target: 250 }, // sustained peak (2 menit)
    { duration: "30s",  target: 0   }, // ramp down
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