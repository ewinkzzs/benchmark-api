// benchmark.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const latency   = new Trend("request_duration");
const errorRate = new Rate("errors");

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const LIMIT    = __ENV.LIMIT    || "1000";

export const options = {
  stages: [
    { duration: "10s", target: 50  }, // ramp up
    { duration: "30s", target: 50  }, // steady
    { duration: "10s", target: 100 }, // spike
    { duration: "30s", target: 100 }, // steady spike
    { duration: "10s", target: 0   }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    errors:            ["rate<0.01"],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/workorders?limit=${LIMIT}`, {
    timeout: "120s", // ← tambahkan timeout yang lebih panjang
  });

  const ok = check(res, {
    "status 200":         (r) => r.status === 200,
    "has data field":     (r) => {
      // ✅ Cek body tidak kosong dulu sebelum parse
      if (!r.body || r.status !== 200) return false;
      try {
        return JSON.parse(r.body).data !== undefined;
      } catch (e) {
        return false;
      }
    },
    "response time < 1s": (r) => r.timings.duration < 1000,
  });

  latency.add(res.timings.duration);
  errorRate.add(!ok);

  sleep(0.1);
}