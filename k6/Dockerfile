FROM grafana/k6:latest

WORKDIR /scripts

COPY benchmark.js .

CMD ["sh", "-c", "k6 run --env BASE_URL=$BASE_URL --env LIMIT=$LIMIT /scripts/benchmark.js"]