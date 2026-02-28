FROM oven/bun:1.1-alpine

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

COPY src ./src

EXPOSE 8080

CMD ["bun", "run", "src/index.ts"]