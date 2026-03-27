# 🎵 OXYCORP — AI Music Career Intelligence System

A full-stack AI-powered music career guidance platform combining **HTML5/CSS3**, **Node.js**, **Python ML**, and **Large Language Models**.

---

## 🗂️ Project Structure

```
soundpath/
├── index.html                    ← Homepage
├── package.json
├── .env.example                  ← Copy to .env
│
├── public/
│   ├── css/
│   │   └── global.css            ← Shared design system
│   ├── js/
│   │   └── shared.js             ← Shared nav/footer/API helpers
│   └── pages/
│       ├── advisor.html          ← LLM-powered AI chat advisor
│       ├── career-analysis.html  ← ML career scoring
│       ├── skill-assessment.html ← AI skill quiz & radar chart
│       ├── market-intelligence.html ← Live market data & charts
│       └── roadmap.html          ← Dynamic AI-generated roadmap
│
├── server/
│   └── server.js                 ← Node.js/Express backend (LLM proxy, ML proxy)
│
└── ml/
    └── ml_service.py             ← Python FastAPI ML engine
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- Python 3.10+
- An [Anthropic API key](https://console.anthropic.com)

### 2. Setup environment
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Install Node.js dependencies
```bash
npm install
```

### 4. Install Python dependencies
```bash
pip install fastapi uvicorn scikit-learn numpy pandas
```

### 5. Start both services
```bash
# Terminal 1 — Node.js server (port 3000)
npm start

# Terminal 2 — Python ML service (port 8000)
cd ml && uvicorn ml_service:app --host 0.0.0.0 --port 8000 --reload

# Or run both together (requires concurrently):
npm run all
```

### 6. Open in browser
```
http://localhost:3000
```

---

## 🤖 AI & ML Features

| Feature | Technology |
|---|---|
| **AI Advisor Chat** | Anthropic Claude LLM via Node.js proxy |
| **Career Score** | Python ML model (Random Forest simulation) |
| **Skill Assessment** | 12-question quiz → radar chart + gap analysis |
| **Market Intelligence** | Python data pipeline + vanilla canvas charts |
| **Career Roadmap** | AI-generated milestones + interactive checklist |
| **Neural Matching** | ML recommendation engine |

---

## 📄 Pages

| Page | Description |
|---|---|
| `index.html` | Homepage with hero, features, tech stack |
| `advisor.html` | Live LLM chat with music career AI |
| `career-analysis.html` | Input metrics → ML career score + insights |
| `skill-assessment.html` | 12-question quiz → skill radar chart |
| `market-intelligence.html` | Genre trends, platform data, sync opportunities |
| `roadmap.html` | Interactive 36-month career roadmap |

---

## 🔌 API Endpoints (Node.js)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/chat` | LLM chat proxy → Anthropic |
| `POST` | `/ml/predict` | Career score → Python ML |
| `POST` | `/ml/skill-analysis` | Skill analysis → Python |
| `GET` | `/ml/market-trends` | Market data → Python |
| `POST` | `/api/generate-roadmap` | LLM roadmap generator |

## 🔌 ML Endpoints (Python FastAPI)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | ML service health |
| `POST` | `/predict` | Career scoring model |
| `POST` | `/skill-analysis` | Skill gap analysis |
| `GET` | `/market-trends` | Music market data |
| `POST` | `/recommendations` | AI recommendations |

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **ML Engine:** Python, FastAPI, NumPy, scikit-learn
- **LLM:** Anthropic Claude (via API)
- **Charts:** Vanilla Canvas API
- **Fonts:** Cormorant Garamond, Space Mono, Outfit

---

*Built by SOUNDPATH · AI-Powered Music Career Intelligence*
