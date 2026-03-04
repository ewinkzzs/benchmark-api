import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const latency   = new Trend("request_duration");
const errorRate = new Rate("errors");

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const LIMIT    = __ENV.LIMIT    || "1000";

export const options = {
  stages: [
    { duration: "30s", target: 20  }, // ramp up pelan
    { duration: "60s", target: 40  }, // steady ringan
    { duration: "30s", target: 60  }, // naik sedang
    { duration: "90s", target: 60  }, // sustained sedang (1.5 menit)
    { duration: "30s", target: 100 }, // naik ke puncak
    { duration: "90s", target: 100 }, // sustained peak (1.5 menit) ← kunci
    { duration: "30s", target: 0   }, // ramp down
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

  sleep(0.5); // ✅ jeda 0.5s antar request
}