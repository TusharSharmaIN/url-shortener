# URL Shortener + Analytics

A URL shortener built to explore backend system design: encoding strategy, cache-aside reads, async event-driven analytics, crash recovery, distributed rate limiting, and a head-to-head comparison of Redis Streams vs Kafka for the same job.

## Live demo

- **Frontend:** https://url-shortener-sage-two.vercel.app
- **API:** https://url-shortener-api-oy1d.onrender.com (`/docs` for Swagger)

> Free-tier hosting: the API may take 30–60s to wake up after inactivity.

## What this is

A shortener where the interesting part isn't the redirect — it's everything around it:

- Short codes are Base62-encoded Postgres auto-increment IDs, not hash + collision retry
- Reads go through a cache-aside layer (Redis), falling back to Postgres on miss
- Every click is pushed to an async queue (Redis Streams or Kafka, switchable) so analytics writes never slow down or break a redirect
- The consumer only acknowledges/commits after a successful Postgres write — a crash mid-batch means unprocessed events are recovered on restart, not lost
- Rate limiting is Redis-backed, switchable between fixed-window and sliding-window algorithms

## Stack

**Backend**

- **API**: NestJS (TypeScript)
- **Worker**: plain Node/TypeScript, or embedded inside the API process on free-tier hosting (`EMBEDDED_WORKER=true`)
- **DB**: PostgreSQL (via TypeORM)
- **Cache/queue/rate-limit**: Redis (cache-aside, Streams, and rate-limit keys, all namespaced under `url-shortener:`)
- **Event queue (alternative)**: Kafka — switchable via `ANALYTICS_TRANSPORT`
- **Containerization**: Docker Compose, healthcheck-gated startup ordering
- **API docs**: Swagger UI at `/docs`

**Frontend**

- Vite + React + TypeScript + Tailwind CSS v4
- Single page: shorten a URL, see cache hit/miss, check click count
- Light/dark theme toggle

## Running locally

**Backend**

```bash
cp .env.example .env   # fill in values
make up                 # postgres + redis only, for local dev without docker for api/worker
make build_up            # full stack — postgres, redis, kafka, api, worker
```

API available at `http://localhost:3000`, docs at `http://localhost:3000/docs`.

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env.local   # point VITE_API_BASE_URL at your local or deployed API
npm run dev
```

Runs at `http://localhost:5173`.

## Notes

- **Short codes**: Base62-encoded Postgres auto-increment ID — deterministic, collision-free by construction, no hash + retry needed.
- **Redirect never blocks on analytics**: clicks are pushed to a queue asynchronously; a slow/failed analytics write can't break a redirect.
- **At-least-once delivery**: the consumer only acks/commits after a successful Postgres write — a crash mid-batch is recovered on restart, not lost.
- **Shared Redis**: production uses one Upstash instance across multiple personal projects, with all keys prefixed (`url-shortener:...`) to avoid collisions.
- **Embedded worker**: on free-tier hosting with no separate worker service, the click consumer runs inside the API process (`EMBEDDED_WORKER=true`).
