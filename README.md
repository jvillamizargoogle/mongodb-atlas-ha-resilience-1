# MongoDB Atlas HA Demo — Resilience Blueprint

A production-quality full-stack demo application for validating MongoDB Atlas High Availability, failover behavior, regional outage simulation, and driver resilience across AWS, Azure, and Google Cloud.

---

## What This Demonstrates

| Scenario | What It Validates |
|---|---|
| Write workload | Majority-acknowledged write throughput and ACK latency under normal conditions |
| Read workload | Read preference routing, secondary reads, and read scalability |
| Mixed workload | Concurrent read/write throughput and tail-latency behavior |
| Update workload | Write-after-write durability with majority write concern |
| Bulk write | Batch insert throughput vs. single-document inserts |
| Primary failover | Driver retry logic, election latency, write availability during failover |
| Regional outage | Node loss simulation, automatic failover to surviving region |

---

## Prerequisites

- **Node.js 20+** (for local dev without Docker)
- **Docker + Docker Compose** (for containerized run)
- **MongoDB Atlas cluster** (M10 or higher recommended for multi-region demos)

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|---|---|---|
| `PORT` | API server port | No (default: 3001) |
| `MONGODB_URI` | Atlas connection string with `retryWrites=true&w=majority` | **Yes** |
| `MONGODB_DB_NAME` | Database name | No (default: atlas_ha_demo) |
| `MONGODB_COLLECTION_NAME` | Collection name | No (default: resilience_events) |
| `APP_REGION` | Cloud region this app instance is deployed in | No (default: us-east-1) |
| `APP_CLOUD_PROVIDER` | `aws`, `azure`, or `gcp` | No (default: aws) |
| `ATLAS_PUBLIC_KEY` | Atlas API public key | For Atlas control plane |
| `ATLAS_PRIVATE_KEY` | Atlas API private key | For Atlas control plane |
| `ATLAS_PROJECT_ID` | Atlas project (group) ID | For Atlas control plane |
| `ATLAS_CLUSTER_NAME` | Atlas cluster name | For Atlas control plane |
| `ATLAS_API_BASE_URL` | Atlas Admin API base URL | No (default: https://cloud.mongodb.com/api/atlas/v2) |
| `ENABLE_ATLAS_CONTROL_PLANE` | Enable cluster info and control plane features | No (default: false) |
| `ENABLE_DESTRUCTIVE_ACTIONS` | Enable failover and outage simulation | No (default: false) |
| `DEFAULT_READ_PREFERENCE` | `primary`, `secondary`, `primaryPreferred`, etc. | No (default: primary) |
| `DEFAULT_WRITE_CONCERN` | `majority`, `1`, `2`, etc. | No (default: majority) |
| `DEFAULT_WORKLOAD_CONCURRENCY` | Number of parallel workers per workload | No (default: 5) |
| `DEFAULT_WORKLOAD_INTERVAL_MS` | Delay between operations per worker (ms) | No (default: 200) |

---

## Running Locally (without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment
cp .env.example .env
# edit .env with your MONGODB_URI

# 3. Start the API (terminal 1)
npm run dev:api

# 4. Start the frontend (terminal 2)
npm run dev:web
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

---

## Running with Docker Compose

```bash
# 1. Copy and fill environment
cp .env.example .env

# 2. Build and start
docker-compose up --build

# 3. Open the demo
open http://localhost:8080
```

To rebuild after code changes:
```bash
docker-compose up --build --force-recreate
```

---

## Building the Container

```bash
# API image
docker build -f docker/Dockerfile.api -t atlas-ha-demo-api .

# Web image
docker build -f docker/Dockerfile.web -t atlas-ha-demo-web .
```

---

## Connecting to Atlas

1. Create a cluster on [cloud.mongodb.com](https://cloud.mongodb.com) (M10+ for multi-region).
2. Add your application server's IP to the Atlas IP Access List, or use `0.0.0.0/0` for demos.
3. Create a database user with `readWrite` permissions on `atlas_ha_demo`.
4. Copy the connection string: **Connect → Drivers → Node.js** and set it as `MONGODB_URI`.

For change streams, your Atlas cluster must be **M10 or higher** (replica sets required).

---

## Deploying to AWS / Azure / GCP

This application is stateless (no local storage). Deploy the two containers anywhere containers run:

**AWS:** ECS Fargate, App Runner, or EC2. Set `APP_CLOUD_PROVIDER=aws` and `APP_REGION` to your AWS region (e.g., `us-east-1`).

**Azure:** Azure Container Apps or AKS. Set `APP_CLOUD_PROVIDER=azure` and `APP_REGION` to the Azure region slug (e.g., `eastus`).

**GCP:** Cloud Run or GKE. Set `APP_CLOUD_PROVIDER=gcp` and `APP_REGION` to the GCP region (e.g., `us-central1`).

For cross-region HA demos, deploy one instance per cloud region and point each at the same Atlas cluster with its region-specific `APP_REGION` value.

---

## Enabling Atlas Control Plane Actions

Atlas control plane features (cluster info, failover, outage simulation) require API credentials:

1. In Atlas, go to **Organization → Access Manager → API Keys**.
2. Create a key with `Project Cluster Manager` role.
3. Set in `.env`:
   ```
   ATLAS_PUBLIC_KEY=<public-key>
   ATLAS_PRIVATE_KEY=<private-key>
   ATLAS_PROJECT_ID=<project-id>
   ATLAS_CLUSTER_NAME=<cluster-name>
   ENABLE_ATLAS_CONTROL_PLANE=true
   ```
4. To also enable failover and outage triggers:
   ```
   ENABLE_DESTRUCTIVE_ACTIONS=true
   ```

Without these, the UI runs in read-only mode and Atlas action buttons are disabled with clear explanations.

---

## Suggested Demo Script

### Step 1 — Baseline write throughput
1. Start the app. Observe the cluster topology in the left sidebar.
2. Click **Write Workload**. Watch the terminal fill with INSERT events.
3. Observe: Writes/sec, ACK Latency, and p50/p95 in the KPI panel.
4. Note stable, low latency — this is the baseline.

### Step 2 — Trigger primary failover under write load
1. Keep the write workload running.
2. Click **Trigger Failover** (requires `ENABLE_DESTRUCTIVE_ACTIONS=true`).
3. Observe in the terminal: write errors or retry events appear briefly.
4. Watch ACK latency spike and error rate rise during the election (~10–30s).
5. Observe: workload recovers automatically. The MongoDB driver retries writes.
6. Note: majority write concern ensures no acknowledged writes are lost.

### Step 3 — Mixed workload with read preference
1. Stop the write workload.
2. Change `DEFAULT_READ_PREFERENCE=secondaryPreferred` in `.env`, restart API.
3. Start **Mixed Read/Write**.
4. Observe reads routing to secondaries (lower p50 read latency due to proximity).
5. Trigger a failover again — reads continue from the secondary that becomes primary.

### Step 4 — Regional outage simulation
1. With `ENABLE_DESTRUCTIVE_ACTIONS=true` and an Atlas multi-region cluster:
2. Enter the cloud provider and region in the outage fields.
3. Click **Start Outage Simulation**.
4. Observe: change stream reconnects, write errors if the primary was in that region.
5. Watch the cluster recover as Atlas promotes a node from another region.
6. Click **End Outage Simulation** to restore all nodes.

### Step 5 — Bulk write throughput comparison
1. Start **Bulk Write** workload.
2. Compare Writes/sec to single-document write workload.
3. Observe: higher documents/sec, higher per-operation latency — the batching tradeoff.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Browser (React)                │
│  Sidebar │ Terminal │ KPIs │ Notes          │
└───────────────┬─────────────────────────────┘
                │ HTTP + SSE (/api/events/stream)
┌───────────────▼─────────────────────────────┐
│           Express API (Node.js)             │
│  Routes: /api/atlas, /api/workloads, ...    │
│  Services: WorkloadManager, MetricsTracker  │
│  Change stream watcher → SSE broadcast      │
└───────────────┬─────────────────────────────┘
                │ MongoDB Driver (w=majority, retryWrites=true)
┌───────────────▼─────────────────────────────┐
│          MongoDB Atlas Cluster              │
│  resilience_events collection               │
│  Change streams (M10+)                      │
└─────────────────────────────────────────────┘
```

---

## Connection Pool Configuration

The API uses an OLTP-optimized pool per MongoDB connection best practices:

| Parameter | Value | Reason |
|---|---|---|
| `maxPoolSize` | 50 | Demo concurrency (up to 50 workers) with headroom |
| `minPoolSize` | 10 | Pre-warmed connections for immediate demo response |
| `maxIdleTimeMS` | 300,000 | 5-min keep-alive on stable long-running server |
| `connectTimeoutMS` | 10,000 | Fail fast on connection issues |
| `serverSelectionTimeoutMS` | 10,000 | Quick failover detection during election |
| `retryWrites` | true | Driver-level write retry (transparent to app) |
| `retryReads` | true | Driver-level read retry |

---

## Known Limitations

- **Change streams require M10+.** Free/Shared tier clusters do not support change streams.
- **Failover endpoint returns 202 immediately.** Atlas triggers the failover asynchronously; the cluster enters `UPDATING` state.
- **Outage simulation availability.** The Atlas outage simulation API is available on select cluster configurations. Check [Atlas docs](https://www.mongodb.com/docs/atlas/reference/api-resources-spec/) for current support.
- **Single backend instance.** The demo runs one API instance. For true multi-region demos, deploy one instance per region against the same Atlas cluster.
- **No authentication.** The demo UI has no login. Do not expose it to the public internet with `ENABLE_DESTRUCTIVE_ACTIONS=true`.
- **Metrics are in-process.** KPI metrics reset on API restart. There is no persistence layer for historical metrics.

---

## Project Structure

```
atlas-ha-demo/
├── apps/
│   ├── api/               Node.js + TypeScript + Express
│   │   └── src/
│   │       ├── db/        MongoDB client + change stream
│   │       ├── routes/    REST endpoints
│   │       ├── services/  WorkloadManager, MetricsTracker, Atlas, EventBus
│   │       └── middleware/
│   └── web/               React + TypeScript + Vite
│       └── src/
│           ├── api/       Typed fetch client
│           ├── components/
│           └── hooks/     useSSE, useAtlas
├── packages/
│   └── shared/            Shared TypeScript types
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```
