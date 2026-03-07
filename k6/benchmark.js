import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const latency   = new Trend("request_duration");
const errorRate = new Rate("errors");

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const LIMIT    = __ENV.LIMIT    || "1000";

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  stages: [
    { duration: "30s",  target: 5  }, // ramp up pelan
    { duration: "60s",  target: 10 }, // steady ringan
    { duration: "30s",  target: 20 }, // naik sedang
    { duration: "60s",  target: 20 }, // sustained sedang
    { duration: "30s",  target: 30 }, // naik ke puncak
    { duration: "120s", target: 30 }, // sustained peak
    { duration: "30s",  target: 0  }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<10000"], // lebih ketat karena internal
    errors:            ["rate<0.3"],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/workorders?limit=${LIMIT}`, {
    timeout: "30s", // lebih pendek karena internal cepat
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
    "response time < 3s": (r) => r.timings.duration < 3000,
  });

  latency.add(res.timings.duration);
  errorRate.add(!ok);

  sleep(1); // ✅ wajib untuk internal network
}