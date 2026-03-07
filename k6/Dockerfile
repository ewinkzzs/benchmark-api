FROM grafana/k6:latest

WORKDIR /scripts

COPY benchmark.js .

# ✅ --quiet = suppress per-request logs, hanya tampilkan summary
CMD ["sh", "-c", "k6 run --quiet --env BASE_URL=$BASE_URL --env LIMIT=$LIMIT /scripts/benchmark.js"]