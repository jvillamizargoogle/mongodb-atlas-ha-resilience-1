# EC2 Installation Guide

Step-by-step instructions to run the Atlas HA Demo on a fresh Amazon Linux 2023 EC2 instance.

## Prerequisites

- EC2 instance: **t3.medium** or larger (2 vCPU, 4 GB RAM recommended)
- AMI: **Amazon Linux 2023** (or Ubuntu 22.04 LTS — adjust package manager commands accordingly)
- Security group inbound rules:
  - Port **22** (SSH) — your IP
  - Port **80** (HTTP) — 0.0.0.0/0 (or your audience IPs)
- A MongoDB Atlas cluster with a database user and network access whitelisted for the EC2 public IP
- Atlas Admin API keys with `Project Owner` role (if enabling the control plane)

---

## 1. Connect to the instance

```bash
ssh -i your-key.pem ec2-user@<EC2_PUBLIC_IP>
```

---

## 2. Install Docker and Docker Compose

```bash
sudo dnf update -y
sudo dnf install -y docker git

# Start Docker and enable on boot
sudo systemctl enable --now docker

# Add ec2-user to the docker group so you don't need sudo
sudo usermod -aG docker ec2-user

# Pick up the new group without logging out
newgrp docker

# Install the Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verify
docker compose version
```

---

## 3. Clone the repository

```bash
git clone https://github.com/<your-org>/CTTI-Hackathon.git
cd CTTI-Hackathon
```

---

## 4. Configure environment variables

```bash
cp .env.example .env
nano .env          # or: vi .env
```

Fill in every value. Minimum required:

| Variable | Description |
|---|---|
| `MONGODB_URI` | Atlas connection string (`mongodb+srv://...`) |
| `MONGODB_DB_NAME` | Database name (e.g. `atlas_ha_demo`) |
| `MONGODB_COLLECTION_NAME` | Collection name (e.g. `resilience_events`) |
| `APP_REGION` | AWS region label shown in the UI (e.g. `us-east-1`) |
| `APP_CLOUD_PROVIDER` | Cloud label shown in the UI (e.g. `aws`) |
| `ATLAS_PUBLIC_KEY` | Atlas Admin API public key |
| `ATLAS_PRIVATE_KEY` | Atlas Admin API private key |
| `ATLAS_PROJECT_ID` | Atlas project ID |
| `ATLAS_CLUSTER_NAME` | Atlas cluster name |
| `ENABLE_ATLAS_CONTROL_PLANE` | `true` to allow failover/outage triggers |
| `ENABLE_DESTRUCTIVE_ACTIONS` | `true` to allow region outage simulation |

> **Tip:** If you are not using the Atlas Admin API, set both `ENABLE_ATLAS_CONTROL_PLANE` and `ENABLE_DESTRUCTIVE_ACTIONS` to `false`.

---

## 5. Whitelist the EC2 IP in Atlas

Before starting the app, add the EC2 instance's public IP to the Atlas Network Access list:

1. Atlas UI → **Network Access** → **Add IP Address**
2. Enter the EC2 public IP and save.

---

## 6. Build and start

```bash
docker compose up -d --build
```

The first build takes a few minutes (downloads Node.js and nginx base images, compiles TypeScript). Subsequent starts are fast.

Check that both containers are healthy:

```bash
docker compose ps
```

Expected output:

```
NAME                 STATUS
ctti-hackathon-api-1   Up (healthy)
ctti-hackathon-web-1   Up
```

Tail logs if you need to debug:

```bash
docker compose logs -f api
docker compose logs -f web
```

---

## 7. Open the app

Navigate to `http://<EC2_PUBLIC_IP>` in a browser.

The React frontend is served by nginx on port 80. All `/api/*` calls are proxied to the Express backend on port 3001 internally — you never need to expose port 3001 publicly.

---

## 8. Useful commands

| Action | Command |
|---|---|
| Stop everything | `docker compose down` |
| Restart after a code change | `docker compose up -d --build` |
| View API logs live | `docker compose logs -f api` |
| Check health endpoint directly | `curl http://localhost:3001/api/health` |
| Pull latest code and redeploy | `git pull && docker compose up -d --build` |

---

## 9. (Optional) HTTPS with a domain

If you have a domain pointing to the EC2 IP, install Certbot and configure an nginx reverse proxy in front of the Docker-managed nginx:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Alternatively, put the instance behind an AWS Application Load Balancer with ACM certificates and update the security group to only allow 80/443 from the ALB.
