# 🎙️ Azure Voice Live Pricing Calculator

A comprehensive, interactive pricing calculator for the **Azure Voice Live API** — Microsoft's unified speech-to-speech solution for real-time voice agents. Estimate monthly costs across all Voice Live tiers, models, and usage scenarios with live prices from the Azure Retail Prices API.

![Azure](https://img.shields.io/badge/Azure-Voice%20Live-0078D4?logo=microsoftazure&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Understanding Voice Live Tiers](#understanding-voice-live-tiers)
- [Understanding LLM Processing Modes](#understanding-llm-processing-modes)
- [Using the Calculator](#using-the-calculator)
- [Running Locally](#running-locally)
- [Deploying to Azure](#deploying-to-azure)
- [Project Structure](#project-structure)
- [Configuration Reference](#configuration-reference)
- [References](#references)

---

## Overview

The **Azure Voice Live API** is a fully managed solution that enables low-latency, high-quality speech-to-speech interactions for voice agents. It integrates speech recognition, generative AI, and text-to-speech into a single unified interface.

This calculator helps you:

- **Estimate monthly costs** for Voice Live API usage across all pricing tiers
- **Compare models** (GPT-Realtime, GPT-4o, GPT-4.1, Phi, etc.) and their cost implications
- **Factor in all billing meters** including text tokens, audio tokens (standard & custom), and native speech-to-speech audio
- **Include additional services** like standalone STT, TTS, Speech Translation, Live Interpreter, and Video Translation
- **Export professional quotes** as PDF or Excel for customer presentations
- **Save and reload reports** with cloud persistence (when deployed to Azure)

---

## Features

| Feature | Description |
|---|---|
| **Live Pricing** | Fetches real-time prices from the [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) |
| **4 Voice Live Tiers** | Pro, Standard, Lite, and BYO (Bring Your Own Model) with per-tier model selection |
| **LLM Processing Modes** | Select Native Audio, Text mode (STT→LLM→TTS), or Both per tier |
| **Auto Token Rates** | Audio input/output token rates auto-set per model family (~10 tok/sec OpenAI, ~12.5 Phi) |
| **Call Estimator** | Input calls/month, duration, turns, and caching level — tokens calculated automatically |
| **Additional Services** | STT, TTS, Speech Translation, Live Interpreter, Video Translation toggles |
| **Multi-Currency** | 17 currencies with region-aware pricing across 25+ Azure regions |
| **PDF Export** | Professional PDF quotes with line-item breakdown via jsPDF |
| **Excel Export** | Detailed Excel workbooks with formatted tables via ExcelJS |
| **Save Reports** | Cloud-persisted reports to Azure Blob Storage with Microsoft Entra ID authentication |
| **Responsive UI** | Modern, accessible interface with tooltips explaining every parameter |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (Client)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │index.html│  │ app.js   │  │styles.css│  │MSAL.js │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP
┌───────────────────────▼─────────────────────────────────┐
│                  Flask Server (server.py)                │
│                                                         │
│  GET /                → Static files (HTML/JS/CSS)      │
│  GET /api/retail/prices → Proxy to Azure Prices API     │
│  GET /api/auth/config → Returns Entra ID config         │
│  GET /api/reports     → List saved reports (authed)     │
│  POST /api/reports    → Save report (authed)            │
│  DELETE /api/reports/:id → Delete report (authed)       │
└──────┬────────────────────────────────┬─────────────────┘
       │                                │
       ▼                                ▼
┌──────────────┐              ┌──────────────────┐
│ Azure Retail │              │ Azure Blob       │
│ Prices API   │              │ Storage (reports) │
└──────────────┘              └──────────────────┘
```

**Why a server-side proxy?** The Azure Retail Prices API (`prices.azure.com`) does not return CORS headers, so browser-side `fetch()` calls are blocked. The Flask server proxies these requests server-side.

---

## Understanding Voice Live Tiers

Voice Live pricing is tier-based, determined by the generative AI model you choose:

| Tier | Models | Best For | Cost Level |
|------|--------|----------|------------|
| **Pro** | GPT-Realtime, GPT-4o, GPT-4.1 | Complex, high-quality conversational scenarios | $$$ |
| **Standard** | GPT-4o Mini Realtime, GPT-4o Mini, GPT-4.1 Mini | Balanced cost/quality for general use | $$ |
| **Lite** | GPT-4.1 Nano, Phi Models | High-volume simple tasks, FAQ bots | $ |
| **BYO** | Your custom model | Full control over LLM, only audio I/O charged | Varies |

### Billing Meters per Tier

Each tier charges across multiple meters:

| Meter | Pro | Standard | Lite | BYO |
|-------|-----|----------|------|-----|
| Text (input/cached/output) | ✅ | ✅ | ✅ | ❌ |
| Audio – Standard (input/cached/output) | ✅ | ✅ | ✅ | ✅ |
| Audio – Custom (input/cached/output) | ✅ | ✅ | ✅ | ✅ |
| Native Audio (speech-to-speech realtime) | ✅ | ✅ | ✅ | ❌ |

---

## Understanding LLM Processing Modes

The **LLM Processing Mode** determines how audio is processed through the generative AI model:

| Mode | How It Works | When to Use |
|------|-------------|-------------|
| **Native Audio** | Audio → LLM (processes audio natively) → Audio. Uses realtime audio models. | Lowest latency; models like GPT-Realtime handle audio directly |
| **Text** | Audio → STT → Text → LLM → Text → TTS → Audio. Classic pipeline. | When using text-only LLMs (GPT-4o, GPT-4.1, Phi) |
| **Both** | Native audio processing + text pipeline running together. Both token types are charged. | Maximum quality with redundancy; higher cost |

> **Note:** Token rates are auto-set based on the model family. OpenAI models generate ~10 audio input tokens/sec and ~20 output tokens/sec. Phi models generate ~12.5 input tokens/sec and ~20 output tokens/sec. These values come from [Microsoft documentation](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live#token-usage-and-cost-estimation).

---

## Using the Calculator

### Step 1: Configure Region & Currency

Use the **configuration panel** at the top to select:
- **Azure Region** — pricing may vary by region
- **Currency** — 17 supported currencies
- **Customer / Project** — appears in exported quotes
- **Quote Reference** — auto-generated, included in exports

### Step 2: Select a Tier & Model

Click on one of the four tier cards (**Pro**, **Standard**, **Lite**, **BYO**):
- Each card has a **model dropdown** with the models available for that tier
- The **LLM Processing Mode** dropdown lets you choose Native Audio, Text, or Both
- **Audio token rates** (input/output tok/sec) are automatically set based on the selected model

### Step 3: Configure Call Volume

In the **Voice Live API Usage** section:
- Enter **total hours/month** (auto-calculates calls), or manually set:
  - **Calls per month**
  - **Average call duration** (minutes)
  - **Average turns per call** (back-and-forth exchanges)
- Set **system prompt size** and **caching level** (None / Light 20% / Heavy 50%)

### Step 4: Toggle Additional Services

Enable/disable additional Azure Speech services:
- **Speech to Text** — standalone transcription (Standard or Custom)
- **Text to Speech** — standalone synthesis (Neural / HD / Custom)
- **Speech Translation** — real-time translation
- **Live Interpreter** — full interpretation pipeline
- **Video Translation** — video dubbing and translation

### Step 5: Review & Export

The **Summary sidebar** (right panel) shows:
- Line-item cost breakdown for every enabled service
- Monthly total with detailed subtotals
- **Export to PDF** — professional quote document
- **Export to Excel** — detailed spreadsheet with formatted tables
- **Save Report** — persists to Azure Blob Storage (requires sign-in)
- **Fetch Prices** — pull live pricing from Azure Retail Prices API

### Refreshing Prices

Click **Refresh Prices** in the header to fetch the latest pricing from the Azure Retail Prices API. The status indicator shows:
- 🟢 **Live prices loaded** — using real-time Azure pricing
- 🟡 **Using default prices** — using built-in fallback prices

---

## Running Locally

### Prerequisites

- **Python 3.10+**
- **pip**

### Setup

```bash
# Clone the repository
git clone https://github.com/amantaras/voice-live-pricing.git
cd voice-live-pricing

# Install dependencies
pip install -r requirements.txt

# Run the server
python server.py
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

> **Note:** Authentication and report saving require Azure configuration (Entra ID app registration + Blob Storage). Without these, the calculator works fully for pricing estimation, PDF export, and Excel export.

---

## Deploying to Azure

This project is ready for deployment to **Azure Container Apps** using the [Azure Developer CLI (`azd`)](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/).

### Prerequisites

- [Azure Developer CLI](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/install-azd)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- An Azure subscription

### Step 1: Register an Entra ID Application

```bash
# Create the app registration
az ad app create \
  --display-name "Voice Live Pricing Calculator" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "http://localhost:8080"

# Note the appId from the output, then add an API scope
az ad app update --id <appId> \
  --identifier-uris "api://<appId>"

# Add an API scope for user access
az ad app permission add --id <appId> \
  --api <appId> \
  --api-permissions <permissionId>=Scope
```

### Step 2: Deploy with azd

```bash
# Initialize the environment
azd init

# Set the Entra ID client ID
azd env set AZURE_CLIENT_ID <your-app-id>

# Deploy everything (infrastructure + application)
azd up
```

This provisions:
- **Azure Container Apps** environment with the Flask app
- **Azure Container Registry** for Docker images
- **Azure Storage Account** with a `reports` container
- **Log Analytics Workspace** for monitoring
- **Managed Identity** with Storage Blob Data Contributor role

### Step 3: Update Redirect URI

After deployment, update the app registration redirect URI to your Container App's FQDN:

```bash
az ad app update --id <appId> \
  --web-redirect-uris "https://<your-app>.azurecontainerapps.io"
```

### Infrastructure

All infrastructure is defined in **Bicep** under the `infra/` directory:

| File | Purpose |
|------|---------|
| `infra/main.bicep` | Subscription-scoped orchestrator |
| `infra/main.parameters.json` | Parameter definitions with azd env vars |
| `infra/modules/container-app.bicep` | Container Apps Environment, ACR, app, RBAC |
| `infra/modules/storage.bicep` | Storage Account with reports container |
| `infra/abbreviations.json` | Resource naming abbreviations |

---

## Project Structure

```
voice-live-pricing/
├── index.html              # Main application page
├── app.js                  # All calculator logic, pricing, exports, auth
├── styles.css              # Complete application styling
├── server.py               # Flask server (proxy, auth, reports API)
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container image definition
├── .dockerignore           # Docker build exclusions
├── azure.yaml              # Azure Developer CLI service definition
└── infra/
    ├── main.bicep           # Main infrastructure template
    ├── main.parameters.json # Deployment parameters
    ├── abbreviations.json   # Resource naming conventions
    └── modules/
        ├── container-app.bicep  # Container Apps + ACR + RBAC
        └── storage.bicep        # Storage Account
```

---

## Configuration Reference

### Environment Variables (Server)

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_TENANT_ID` | Microsoft Entra ID tenant ID | For auth |
| `AZURE_CLIENT_ID` | App registration client ID | For auth |
| `AZURE_STORAGE_ACCOUNT_NAME` | Storage account name for reports | For save |
| `REPORTS_CONTAINER` | Blob container name (default: `reports`) | No |
| `PORT` | Server port (default: `8080`) | No |

### Token Rate Defaults

Based on [Microsoft documentation](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live#token-usage-and-cost-estimation):

| Model Family | Audio Input (tok/sec) | Audio Output (tok/sec) |
|---|---|---|
| Azure OpenAI models | ~10 | ~20 |
| Phi models | ~12.5 | ~20 |

---

## References

- [Voice Live API Overview](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live) — Official documentation
- [Voice Live API How-To Guide](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-how-to) — Configuration and usage
- [Azure Speech Services Pricing](https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/) — Official pricing page
- [Azure Retail Prices API](https://learn.microsoft.com/rest/api/cost-management/retail-prices/azure-retail-prices) — Programmatic price access
- [Voice Live API Reference](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-api-reference-2025-10-01) — API event reference

---

## License

This project is provided as-is for estimation purposes. Azure pricing may change — always verify with the [official Azure pricing page](https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/).
