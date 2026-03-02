<div align="center">

# 🎙️ Azure Voice Live Pricing Calculator

**Estimate, compare, and export Azure Voice Live API costs — instantly.**

A professional-grade interactive pricing calculator for the [Azure Voice Live API](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live), Microsoft's unified speech-to-speech platform for real-time voice agents. Pull live pricing from the Azure Retail Prices API, compare tiers and models side-by-side, and generate production-ready quotes.

[![Azure](https://img.shields.io/badge/Azure-Voice%20Live-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Deploy](https://img.shields.io/badge/azd-Deploy%20to%20Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)](#-deploying-to-azure)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<br>

<img src="docs/images/01-dashboard-overview.png" alt="Azure Voice Live Pricing Calculator — Dashboard" width="900">

</div>

---

## 📋 Table of Contents

<details>
<summary>Click to expand</summary>

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Screenshots](#-screenshots)
- [How It Works](#-how-it-works)
  - [Architecture](#architecture)
  - [Voice Live Tiers](#voice-live-tiers)
  - [LLM Processing Modes](#llm-processing-modes)
- [Getting Started](#-getting-started)
  - [Using the Calculator](#using-the-calculator)
  - [Running Locally](#running-locally)
- [Deploying to Azure](#-deploying-to-azure)
- [Project Structure](#-project-structure)
- [Configuration Reference](#-configuration-reference)
- [References & Resources](#-references--resources)
- [License](#-license)

</details>

---

## 🔍 Overview

The **Azure Voice Live API** is a fully managed service enabling low-latency, high-quality speech-to-speech interactions for voice agents. It integrates speech recognition, generative AI, and text-to-speech into a single unified interface.

This calculator solves a real problem: **Voice Live pricing is complex** — multiple tiers, multiple models, multiple billing meters, caching discounts, and LLM processing modes that all interact. This tool lets you model any scenario in seconds.

### What you can do

| | |
|---|---|
| 📊 **Estimate costs** | Model monthly costs across all 4 Voice Live tiers with real Azure pricing |
| 🔄 **Compare models** | GPT-Realtime, GPT-4o, GPT-4.1, GPT-4.1 Nano, Phi — see cost impact instantly |
| 🧮 **Smart token math** | Auto-calculates token consumption from hours, calls, turns, and caching levels |
| 📄 **Export quotes** | Generate professional PDF and Excel quotes for customer presentations |
| 💾 **Save & reload** | Cloud-persist reports to Azure Blob Storage with Entra ID authentication |
| 🌍 **Multi-region** | 25+ Azure regions, 17 currencies, live exchange rates |

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### Pricing Engine
- **Live pricing** from the [Azure Retail Prices API](https://learn.microsoft.com/rest/api/cost-management/retail-prices/azure-retail-prices)
- **4 tiers** — Pro, Standard, Lite, BYO with per-tier model selection
- **3 LLM modes** — Native Audio, Text (STT→LLM→TTS), Both
- **Auto token rates** — ~10 tok/sec (OpenAI), ~12.5 tok/sec (Phi)
- **System prompt caching** — None, Light (20%), Heavy (50%)

</td>
<td width="50%">

### Exports & Reporting
- **PDF export** — Professional Bill of Quantities via jsPDF
- **Excel export** — Formatted workbooks via ExcelJS
- **Cloud save** — Azure Blob Storage with Entra ID auth
- **17 currencies** with live conversion rates
- **Quote references** — Auto-generated tracking IDs

</td>
</tr>
<tr>
<td>

### Additional Services
- Speech to Text (Standard & Custom)
- Text to Speech (Neural, HD, Custom)
- Speech Translation
- Live Interpreter
- Video Translation

</td>
<td>

### Developer Experience
- **One-command deploy** — `azd up` to Azure Container Apps
- **Infrastructure as Code** — Full Bicep templates
- **Screenshots script** — Playwright-based `screenshots.py`
- **Managed Identity** — Zero-secret Azure auth
- **Responsive UI** — Works on any screen size

</td>
</tr>
</table>

---

## 📸 Screenshots

<details open>
<summary><strong>Dashboard Overview</strong> — Full application view with all configuration options</summary>
<br>
<img src="docs/images/01-dashboard-overview.png" alt="Dashboard Overview" width="900">
</details>

<details>
<summary><strong>Configuration Panel</strong> — Region, currency, customer info, and quote reference</summary>
<br>
<img src="docs/images/02-config-panel.png" alt="Configuration Panel" width="900">
</details>

<details>
<summary><strong>Tier Selection</strong> — Four Voice Live tiers with model and LLM mode dropdowns</summary>
<br>
<img src="docs/images/03-tier-selection.png" alt="Tier Selection" width="900">
</details>

<details>
<summary><strong>Standard Tier Selected</strong> — Tier card highlighting with model-specific options</summary>
<br>
<img src="docs/images/04-tier-standard-selected.png" alt="Standard Tier Selected" width="900">
</details>

<details>
<summary><strong>Call Estimator</strong> — Configure call volume, duration, turns, speech model, caching, and token rates</summary>
<br>
<img src="docs/images/05-call-estimator.png" alt="Call Estimator" width="900">
</details>

<details>
<summary><strong>Token Breakdown</strong> — Detailed per-category token and cost table</summary>
<br>
<img src="docs/images/06-token-breakdown.png" alt="Token Breakdown" width="900">
</details>

<details>
<summary><strong>Cost Summary</strong> — Live cost breakdown with export and save actions</summary>
<br>
<img src="docs/images/07-cost-summary.png" alt="Cost Summary" width="400">
</details>

<details>
<summary><strong>Full Page with Additional Services</strong> — STT, TTS, Translation services enabled</summary>
<br>
<img src="docs/images/08-full-page-with-services.png" alt="Full Page with Services" width="900">
</details>

---

## ⚙️ How It Works

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       Browser (Client)                       │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐ │
│  │ index.html │  │   app.js   │  │styles.css│  │ MSAL.js  │ │
│  │            │  │            │  │          │  │ (Auth)   │ │
│  └────────────┘  └────────────┘  └──────────┘  └──────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼───────────────────────────────────┐
│                   Flask Server (server.py)                    │
│                                                              │
│  GET  /                  → Static files (HTML/JS/CSS)        │
│  GET  /api/retail/prices → Proxy → Azure Retail Prices API   │
│  GET  /api/auth/config   → Returns Entra ID configuration    │
│  GET  /api/reports       → List saved reports (JWT auth)     │
│  POST /api/reports       → Save report (JWT auth)            │
│  DEL  /api/reports/:id   → Delete report (JWT auth)          │
└───────┬──────────────────────────────────────┬───────────────┘
        │                                      │
        ▼                                      ▼
┌───────────────┐                   ┌────────────────────┐
│  Azure Retail │                   │  Azure Blob        │
│  Prices API   │                   │  Storage (reports)  │
│  (public)     │                   │  (authenticated)    │
└───────────────┘                   └────────────────────┘
```

> **Why a server-side proxy?** The Azure Retail Prices API (`prices.azure.com`) does not return CORS headers, so direct browser `fetch()` calls are blocked. The Flask server proxies these requests server-side, avoiding CORS restrictions entirely.

### Voice Live Tiers

Voice Live pricing is tier-based, determined by the generative AI model you choose:

| Tier | Badge | Models | Best For | Cost |
|:-----|:-----:|--------|----------|:----:|
| **Pro** | 🟣 | GPT-Realtime, GPT-4o, GPT-4.1 | Complex, high-quality conversational scenarios | $$$ |
| **Standard** | 🔵 | GPT-4o Mini Realtime, GPT-4o Mini, GPT-4.1 Mini | Balanced cost/quality for general use | $$ |
| **Lite** | 🟢 | GPT-4.1 Nano, Phi Models | High-volume simple tasks, FAQ bots | $ |
| **BYO** | ⚪ | Your custom model | Full control — only audio I/O charged | Varies |

<details>
<summary><strong>Billing Meters per Tier</strong></summary>

| Meter | Pro | Standard | Lite | BYO |
|:------|:---:|:--------:|:----:|:---:|
| LLM Text (input / cached / output) | ✅ | ✅ | ✅ | — |
| Audio – Standard (input / cached / output) | ✅ | ✅ | ✅ | ✅ |
| Audio – Custom (input / cached / output) | ✅ | ✅ | ✅ | ✅ |
| LLM Native Audio (speech-to-speech) | ✅ | ✅ | ✅ | — |

</details>

### LLM Processing Modes

The **LLM Processing Mode** controls how audio flows through the generative AI model:

| Mode | Pipeline | Use Case |
|:-----|:---------|:---------|
| **Native Audio** | `Audio → LLM → Audio` | Lowest latency — models like GPT-Realtime handle audio natively |
| **Text** | `Audio → STT → LLM → TTS → Audio` | Classic pipeline for text-only LLMs (GPT-4o, GPT-4.1, Phi) |
| **Both** | Native Audio + Text simultaneously | Maximum quality with redundancy; both token types charged |

> 💡 **Token rates are auto-set per model family:**
> OpenAI models — ~10 input tok/sec, ~20 output tok/sec.
> Phi models — ~12.5 input tok/sec, ~20 output tok/sec.
> Source: [Microsoft documentation](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live#token-usage-and-cost-estimation)

---

## 🚀 Getting Started

### Using the Calculator

<table>
<tr>
<td width="60%">

**Step 1 — Configure Region & Currency**

Select your Azure region, display currency, customer name, and quote reference from the configuration panel.

**Step 2 — Select a Tier & Model**

Click a tier card (Pro / Standard / Lite / BYO). Each has a model dropdown and an LLM Processing Mode selector. Token rates update automatically.

**Step 3 — Set Call Volume**

Enter total hours/month or configure manually: calls/month, average duration, turns per call, speech model type, and caching level.

**Step 4 — Toggle Additional Services**

Enable any combination of standalone STT, TTS, Speech Translation, Live Interpreter, or Video Translation.

**Step 5 — Review & Export**

The cost summary updates in real time. Export as PDF, Excel, or save to the cloud.

</td>
<td width="40%">

<img src="docs/images/07-cost-summary.png" alt="Cost Summary Sidebar" width="350">

</td>
</tr>
</table>

<table>
<tr>
<td width="50%">
<img src="docs/images/04-tier-standard-selected.png" alt="Tier Selection" width="450">
<br><em>Tier cards with per-tier model & LLM mode selection</em>
</td>
<td width="50%">
<img src="docs/images/06-token-breakdown.png" alt="Token Breakdown" width="450">
<br><em>Detailed token breakdown by category</em>
</td>
</tr>
</table>

### Running Locally

**Prerequisites:** Python 3.10+ and pip.

```bash
# Clone the repository
git clone https://github.com/amantaras/voice-live-pricing.git
cd voice-live-pricing

# Install dependencies
pip install -r requirements.txt

# Start the server
python server.py
```

Open **http://localhost:8080** in your browser.

> 📝 Authentication and cloud report saving require Azure configuration (Entra ID + Blob Storage). Without these, the calculator works fully for pricing estimation, PDF export, and Excel export.

---

## ☁️ Deploying to Azure

This project deploys to **Azure Container Apps** with a single command using the [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/).

### What gets provisioned

| Resource | Purpose |
|:---------|:--------|
| **Azure Container Apps** | Hosts the Flask application (scales 0–3 replicas) |
| **Azure Container Registry** | Stores the Docker image (Basic SKU) |
| **Azure Storage Account** | Blob container for saved reports |
| **Log Analytics Workspace** | Application monitoring and diagnostics |
| **Managed Identity** | Zero-secret auth with Storage Blob Data Contributor role |

### Step 1: Register an Entra ID Application

```bash
# Create the app registration
az ad app create \
  --display-name "Voice Live Pricing Calculator" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "http://localhost:8080"

# Note the appId, then configure the API
az ad app update --id <appId> \
  --identifier-uris "api://<appId>"
```

### Step 2: Deploy

```bash
# Initialize the azd environment
azd init

# Set your Entra ID client ID
azd env set AZURE_CLIENT_ID <your-app-id>

# Deploy infrastructure + application
azd up
```

### Step 3: Update Redirect URI

After deployment, update redirect to your Container App's FQDN:

```bash
az ad app update --id <appId> \
  --web-redirect-uris "https://<your-app>.azurecontainerapps.io"
```

<details>
<summary><strong>Infrastructure Details (Bicep)</strong></summary>

All infrastructure is defined in Bicep under `infra/`:

| File | Purpose |
|:-----|:--------|
| `infra/main.bicep` | Subscription-scoped orchestrator |
| `infra/main.parameters.json` | Parameter definitions with azd env vars |
| `infra/modules/container-app.bicep` | Container Apps Environment, ACR, Container App, RBAC |
| `infra/modules/storage.bicep` | Storage Account with `reports` container |
| `infra/abbreviations.json` | Resource naming abbreviations |

</details>

---

## 📁 Project Structure

```
voice-live-pricing/
│
├── index.html                  # Main application page
├── app.js                      # Calculator logic, pricing engine, exports, auth
├── styles.css                  # Complete application styling (~1000 lines)
├── server.py                   # Flask server — proxy, auth, reports API
├── requirements.txt            # Python dependencies
│
├── Dockerfile                  # Container image (Python 3.12 + gunicorn)
├── .dockerignore               # Docker build exclusions
├── azure.yaml                  # Azure Developer CLI service definition
│
├── screenshots.py              # Playwright script to regenerate screenshots
│
├── docs/
│   └── images/                 # Auto-generated screenshots for documentation
│       ├── 01-dashboard-overview.png
│       ├── 02-config-panel.png
│       ├── 03-tier-selection.png
│       ├── 04-tier-standard-selected.png
│       ├── 05-call-estimator.png
│       ├── 06-token-breakdown.png
│       ├── 07-cost-summary.png
│       └── 08-full-page-with-services.png
│
└── infra/                      # Azure infrastructure (Bicep)
    ├── main.bicep
    ├── main.parameters.json
    ├── abbreviations.json
    └── modules/
        ├── container-app.bicep
        └── storage.bicep
```

---

## 🔧 Configuration Reference

### Environment Variables

| Variable | Description | Required |
|:---------|:------------|:--------:|
| `AZURE_TENANT_ID` | Microsoft Entra ID tenant ID | Auth |
| `AZURE_CLIENT_ID` | App registration client ID | Auth |
| `AZURE_STORAGE_ACCOUNT_NAME` | Storage account for saved reports | Save |
| `REPORTS_CONTAINER` | Blob container name (default: `reports`) | — |
| `PORT` | Server port (default: `8080`) | — |

### Token Rate Defaults

Per [Microsoft documentation](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live#token-usage-and-cost-estimation):

| Model Family | Input (tok/sec) | Output (tok/sec) |
|:-------------|:---------------:|:-----------------:|
| Azure OpenAI (GPT-4o, GPT-4.1, etc.) | ~10 | ~20 |
| Phi Models | ~12.5 | ~20 |

### Regenerating Screenshots

Screenshots are auto-generated via Playwright. To update after UI changes:

```bash
pip install playwright && playwright install chromium
python server.py &     # start the server
python screenshots.py  # capture all screenshots
```

---

## 📚 References & Resources

| Resource | Link |
|:---------|:-----|
| Voice Live API Overview | [learn.microsoft.com](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live) |
| Voice Live How-To Guide | [learn.microsoft.com](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-how-to) |
| Azure Speech Pricing | [azure.microsoft.com](https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/) |
| Azure Retail Prices API | [learn.microsoft.com](https://learn.microsoft.com/rest/api/cost-management/retail-prices/azure-retail-prices) |
| Voice Live API Reference | [learn.microsoft.com](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-api-reference-2025-10-01) |
| Azure Developer CLI (azd) | [learn.microsoft.com](https://learn.microsoft.com/azure/developer/azure-developer-cli/) |

---

## 📄 License

This project is provided as-is for estimation purposes. Azure pricing may change — always verify with the [official Azure pricing page](https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/).

---

<div align="center">

**Built with** ❤️ **for the Azure Speech community**

[Report an Issue](https://github.com/amantaras/voice-live-pricing/issues) · [Request a Feature](https://github.com/amantaras/voice-live-pricing/issues/new)

</div>
