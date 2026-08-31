<div align="center">

# 🛡️ TrustTape Copilot
**Enterprise Data Validation, Maker-Checker Authorization, & Fraud Intelligence Engine**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Hosted_on_Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://your-app.vercel.app)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](#)
[![Render](https://img.shields.io/badge/Render_Backend-46E3B7?style=for-the-badge&logo=render&logoColor=black)](#)
[![Neon](https://img.shields.io/badge/Neon_Postgres-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](#)

### 🚀 **[Launch Live Demo](https://your-app.vercel.app)** 🚀

</div>

## 📌 Product Overview

In institutional finance, onboarding raw loan tapes is a manual, error-prone, and highly risky bottleneck. **TrustTape Copilot** is a full-stack, AI-powered data ingestion platform built to automate tape processing, catch invisible financial anomalies, and enforce strict compliance workflows.

By combining deterministic rules with a simulated **Generative Machine Learning (VAE) pipeline**, TrustTape doesn't just check for blank fields—it actively detects multi-variable fraud. Coupled with an LLM-powered resolution Copilot and an enterprise-grade Maker-Checker authorization lock, this platform reduces tape processing time from days to minutes while mathematically guaranteeing data integrity.

---

## 🏗️ System Architecture

```mermaid
graph TD
    %% Define Styles
    classDef client fill:#000000,stroke:#fff,stroke-width:2px,color:#fff;
    classDef engine fill:#1e293b,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef ml fill:#312e81,stroke:#8b5cf6,stroke-width:2px,color:#fff;
    classDef db fill:#00291B,stroke:#00E599,stroke-width:2px,color:#00E599;
    classDef human fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff;

    %% Nodes
    A[Raw Loan Tape .CSV]:::client -->|Upload via Vercel UI| B(Ingestion Engine on Render):::engine
    B --> C{Static Rules Engine}:::engine
    C -->|Pass| D{Generative ML Engine}:::ml

    C -->|Fail Format| E[Exception Queue]:::client
    D -->|High KL-Divergence / Anomaly > 85%| E

    D -->|Clean Record| F[(Neon Cloud Postgres)]:::db

    E --> G[AI Copilot Inference]:::ml
    G --> H[Maker: Data Operator]:::human
    H -->|Submits Fix| I[Checker: Compliance Manager]:::human
    I -->|Authorizes & Commits| F

    F -->|Automated ETL Sync| J[(Cloud Data Warehouse)]:::db
```

---

## ✨ Core Product Features

- **Intelligent Data Ingestion**: Lightning-fast CSV parsing that sanitizes, normalizes, and queues thousands of institutional loan records asynchronously.

- **Predictive Fraud Detection (VAE Simulation)**: Cross-references data points in a continuous latent space. If a borrower has an 'A' credit grade but a predatory 18.5% interest rate, the generative engine spikes the reconstruction loss and instantly flags the multi-variable anomaly.

- **AI Copilot Auto-Remediation**: Evaluates broken raw data against system constraints and generates one-click JSON payloads to fix errors, complete with confidence scoring.

- **Maker-Checker Authorization**: Strict Role-Based Access Control (RBAC). Data Operators (Makers) can only propose fixes; Compliance Managers (Checkers) must authorize them. Locked states prevent bypassing compliance.

- **Bulk Auto-Resolve Pipeline**: Enterprise-scale batch processing that allows AI to analyze and queue 500+ records simultaneously for single-click manager approval.

- **Cloud ETL Warehousing**: Once records reach 100% compliance, an automated Extract-Transform-Load (ETL) pipeline sweeps the operational database clean and archives the finalized tape into cold-storage analytics tables.

---

## 💻 Tech Stack & Cloud Infrastructure

| Layer | Technology |
|---|---|
| **Frontend Hosting** | Vercel (React 18, Vite, Tailwind CSS) |
| **Backend Hosting** | Render (Node.js, Express.js, TypeScript) |
| **Cloud Database** | Neon Serverless Postgres (Prisma ORM) |
| **AI Provider** | Google Gemini API |

---

## 🎯 Live Demo Presentation Flow

To demonstrate the full power of the platform to hackathon judges, execute this specific flow on the live deployment:

1. **Upload**: Navigate to **Data Ingestion** and upload a CSV containing one normal record and one hidden financial anomaly (e.g., mismatched interest rate to credit grade).

2. **Trigger ML**: Show how the *Generative ML Engine* caught the statistical anomaly and generated a `CRITICAL` alert, rather than just checking for missing text.

3. **Generate Fix**: Open the **Review Queue**, select the anomaly, and click **Ask AI Copilot**.

4. **Demonstrate RBAC**: Click *Submit Fix* as the **Data Operator** to lock the record. Toggle to **Compliance Manager** to authorize and commit the change to the database.

5. **Run ETL Sync**: Open the **Executive Report** and run the **Cloud Analytics Warehouse** pipeline to securely migrate the now-perfect tape into cold storage.

---

## 🚀 Local Setup (For Development)

If you wish to run this repository locally instead of using the live deployment:

### 1. Clone & Install

```bash
git clone https://github.com/your-username/trust-tape-copilot.git
cd trust-tape-copilot
cd frontend && npm install
cd ../backend && npm install
```

### 2. Environment Setup

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="your_neon_or_local_postgres_url"
GEMINI_API_KEY="your_google_ai_key"
```

### 3. Database Initialization & Run

```bash
cd backend
npx prisma db push
npx prisma db seed
npm run dev # Starts Backend on Port 3000

# Open a new terminal
cd frontend
npm run dev # Starts Frontend on Port 5173
```