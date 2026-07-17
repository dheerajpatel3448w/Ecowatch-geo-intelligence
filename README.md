# 🌍 EcoWatch — AI Deforestation Intelligence Platform

> **An AI-powered Satellite Forest Monitoring & Deforestation Detection System built to combat deforestation, illegal mining, and ecological damage.**

EcoWatch combines a Next.js command-center UI, Apache Kafka for high-throughput event streaming, and Python-based Machine Learning (Qwen2-VL) to analyze satellite imagery in real-time. It provides autonomous monitoring, historical analysis, and on-ground field validation.

---

## 🚀 Key Features

- **🌐 Global Threat Radar:** A 3D geospatial dashboard with real-time alerts, metrics, and threat mapping.
- **🛰️ Satellite AI Analysis:** Integrates the Qwen2-VL-2B-Instruct Vision-Language Model with Sentinel-2 L2A archive to automatically detect deforestation and environmental anomalies.
- **📅 Monitoring Campaigns:** Schedule repeated satellite scans across time to track deforestation. Generates alerts dynamically and provides final reports with AI verdicts.
- **🕒 Historical Analysis:** Compare satellite imagery across time from the Sentinel-2 archive (2015-present). Analyzes multi-date scans, calculates total forest loss, annual rates, and provides an AI professional verdict.
- **📡 Mission Control (Zones):** Draw and manage surveillance zones directly on a map using React-Leaflet. Trigger manual or automated ML scans for specific coordinates.
- **⚖️ Legal & Carbon Engine:** Calculates exact Carbon loss and generates official **PDF Legal Evidence Reports** automatically for FIR submission.
- **📱 Field Operations Portal:** A mobile-first UI for ground rangers to upload evidence photos, matched with GPS locations, which are also verified locally by AI.
- **⚡ Real-Time Streaming:** End-to-end Kafka integration handling heavy ML workloads asynchronously between Node.js and Python, with WebSocket updates to the frontend.

---

## 🏗️ Architecture & Tech Stack

The platform is divided into three main microservices, heavily utilizing containerization for the infrastructure.

### 1. Frontend (`/ecowatch`)
- **Framework:** Next.js (App Router), React 19
- **Styling:** Tailwind CSS v4, Framer Motion (Military/Command-Center Dark Theme, Glassmorphism)
- **Mapping & 3D:** React-Leaflet, Mapbox-GL, Three.js, React-Three-Fiber
- **Data Visualization:** Recharts
- **Real-Time:** Socket.IO Client

### 2. API Backend (`/node-service`)
- **Runtime:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Message Broker:** KafkaJS (Producer/Consumer)
- **Features:** JWT Authentication, Role-Based Access Control (Admin, Analyst, Ranger), PDFKit (Legal Reports), Multer (Image Uploads), Node-Cron (Campaign Scheduler)

### 3. ML Service (`/ml-service`)
- **Runtime:** Python 3.11+, FastAPI
- **AI Models:** Qwen2-VL-2B-Instruct, HuggingFace Transformers, PyTorch
- **Message Broker:** Confluent-Kafka
- **Features:** Satellite image processing (Sentinel Hub), NDVI physics logic, local photo validation, automated historical scan aggregation.

### 4. Infrastructure (`docker-compose.yml`)
- **Zookeeper & Kafka:** Confluent images for event streaming.
- **MongoDB:** Database storage.

---

## ⚙️ Setup & Installation

### 1. Start Infrastructure (Docker)
Ensure Docker Desktop is running, then spin up MongoDB, Zookeeper, and Kafka.
```bash
docker compose up -d
```

### 2. Setup Node.js API Service
```bash
cd node-service
npm install
npm run dev
```
*(Runs on `http://localhost:5000`)*

### 3. Setup Python ML Service
*Note: Run locally to utilize system GPU or CPU for heavy ML processing.*
```bash
cd ml-service
python -m venv .venv
# Activate venv: .venv\Scripts\activate (Windows) OR source .venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
uvicorn api.app:app --host 0.0.0.0 --port 8001
```
*(Runs on `http://localhost:8001`)*

### 4. Setup Next.js Frontend
```bash
cd ecowatch
npm install
npm run dev
```
*(Runs on `http://localhost:3000`)*

---

## 🔐 Environment Variables

You will need `.env` files in each respective directory. Here is a basic template based on the architecture:

**`/node-service/.env`**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ecowatch
JWT_SECRET=ecowatch_production_secret_change_me
KAFKA_BROKER=localhost:9092
ML_SERVICE_URL=http://localhost:8001
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
```

**`/ml-service/.env`**
```env
KAFKA_BROKER=localhost:9092
KAFKA_GROUP=ml-workers
SH_CLIENT_ID=your_sentinel_hub_client_id
SH_CLIENT_SECRET=your_sentinel_hub_client_secret
HF_TOKEN=your_huggingface_token
MODEL_NAME=Qwen/Qwen2-VL-2B-Instruct
LOG_LEVEL=INFO
```

---

## 👨‍💻 Developer & Maintainer

Built by **Dheeraj Patel** (MERN Stack & AI Developer).

> *Designed with a deep-space dark theme, neon accents, and a passion for saving the planet via technology.*
