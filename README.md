# MediCareAI-Agent

> A structured clinical interview system that collects patient history across 23 dimensions and produces differential diagnoses — with production-grade LLM infrastructure underneath.

---

## The Problem

Most AI health chatbots are free-form chat: patient types symptoms, LLM replies with a paragraph. This has three problems:

1. **Incomplete history.** A chatbot asks whatever occurs to it. Real clinicians follow a systematic interview covering HPI, past medical history, medications, allergies, family history, lifestyle — missing any of these can miss critical clues.
2. **Unstructured output.** A paragraph of text is not actionable for a doctor. Clinicians need structured data: differential diagnoses ranked by confidence, key supporting findings, red flags highlighted.
3. **No quality guardrails.** Without structured output validation, caching, rate limiting, and observability, a medical AI system is unsafe to deploy even as a triage tool.

**This project addresses all three.** It's not a chatbot. It's a clinical interview engine.

---

## What It Does

```
Patient types: "I've had a headache and fever for 3 days"
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 1: Structured Clinical Interview                 │
│                                                         │
│  Track A (history-taking):                              │
│    "When did the headache start?"                        │
│    "How severe is the pain on a 1-10 scale?"             │
│    "Any other symptoms? Nausea? Light sensitivity?"      │
│    "Do you have any chronic conditions?"                 │
│    "What medications are you currently taking?"           │
│    ...covers 23 clinical dimensions...                   │
│                                                         │
│  Track B (search-augmented):                            │
│    SearXNG searches medical sources for the symptoms    │
│    → Generates targeted follow-ups based on evidence     │
│    "Have you traveled recently? Any neck stiffness?"     │
│                                                         │
│  Orchestrator: merges, deduplicates, loops until done   │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 2: Differential Diagnosis                        │
│                                                         │
│  Structured JSON output:                                │
│  {                                                      │
│    "primary_diagnosis": "Viral upper respiratory...",   │
│    "differential": ["Migraine", "Tension headache", ...],│
│    "confidence": "medium",                               │
│    "red_flags": ["Neck stiffness → rule out meningitis"],│
│    "recommendations": ["Symptomatic treatment", ...],    │
│    "follow_up": "If fever persists >5 days, see doctor" │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Phase 3: Doctor Review (if needed)                     │
│                                                         │
│  Complex/uncertain cases → routed to doctor dashboard   │
│  Doctor sees: full interview transcript + diagnosis +    │
│  evidence sources → approves, modifies, or escalates    │
└─────────────────────────────────────────────────────────┘
```

**Intent routing** ensures the right pipeline runs:
- "I have a headache" → Diagnosis pipeline (structured interview + differential)
- "How is my recovery going?" → Monitoring pipeline (progress check)
- "What's the treatment plan?" → Planning pipeline (care plan generation)
- "What are the latest guidelines for diabetes?" → Research pipeline (knowledge search)

---

## Architecture

### System Design

```
Nginx → React SPA (MUI 9 + Vite 8)
     → FastAPI (4 uvicorn workers, SSE streaming)
         ├── Intent Router (MasterAgent: classify → route)
         ├── Interview Orchestrator
         │   ├── Track A Agent (history-taking, 23 dimensions)
         │   └── Track B Agent (search-augmented, SearXNG)
         ├── Domain Agents
         │   ├── DiagnosisAgent (structured differential Dx)
         │   ├── PlanningAgent (treatment/care plans)
         │   └── MonitoringAgent (recovery tracking)
         └── Doctor Verification Portal
              └── Case review + approve/modify/escalate
```

### LLM Infrastructure Layer

```
Request → Intent Router (regex, free)
              │
          Route to domain agent
              │
      ┌───────┴────────┐
      │  Cache Check    │  ← SHA256 exact match, Redis
      │  Hit? → return  │     5 min TTL (chat)
      └───────┬────────┘
              │ (miss)
      ┌───────┴────────┐
      │  Rate Limiter   │  ← Sliding window per category
      │  Over? → 429    │     auth 20/min, llm 200/min
      └───────┬────────┘
              │
      ┌───────┴────────┐
      │  LLM API Call   │  ← DeepSeek (OpenAI-compatible)
      │  + Structured   │     3-tier output fallback
      │    Output Valid  │     json_schema → generate →
      └───────┬────────┘     manual extraction
              │
      ┌───────┴────────┐
      │  Metrics Record │  ← P50/P95/P99 latency
      │  + Cache Store  │     Token counts, error log
      └────────────────┘
```

---

## Design Decisions & Trade-offs

### Why structured interview instead of free-form chat?

**Problem:** Free-form chat misses clinical dimensions. A patient with headache might never mention their medications, allergies, or family history unless explicitly asked.

**Decision:** Model the real clinical workflow. 23 dimensions across HPI (onset, quality, severity, timing, aggravating factors, associated symptoms, treatment history), past medical history, personal history, family history, medications.

**Trade-off:** Structured interview takes more rounds than free-form chat. User might feel like filling out a form. Mitigation: questions use conversational language, allow skip, limit 1-2 questions per round.

### Why two interview tracks (A + B) instead of one?

**Problem:** Search results (SearXNG) can enrich the interview with evidence-based questions, but search is slow and sometimes unavailable.

**Decision:** Track A runs on every round (LLM clinical knowledge only, always available). Track B only fires when search results are ready (adds evidence-grounded questions). If search fails, Track A still works — graceful degradation.

**Trade-off:** Two LLM calls per round instead of one when search is available. Worth it because Track B questions cite external sources, increasing clinicians' confidence in the system's thoroughness.

### Why regex-based intent routing instead of LLM classifier?

**Problem:** Every incoming message needs routing (diagnosis/planning/monitoring/research). Using an LLM to classify intent costs tokens on every message.

**Decision:** Regex classifier: zero tokens, zero latency. Handles ~90% of clear-cut cases ("I have a headache" → diagnosis, "How's my recovery?" → monitoring). Ambiguous inputs default to a safe middle ground.

**Trade-off:** ~10% edge cases might get suboptimal routing. Acceptable because the cost savings (no classification tokens) outweigh occasional misrouting. An embedding-based local classifier would be strictly better if the ops overhead of serving a model is acceptable.

### Why pgvector instead of a dedicated vector database?

**Decision:** PostgreSQL already stores users, cases, and config. Adding vectors there means one less service to manage, transactional consistency, no ETL.

**Trade-off:** pgvector's ANN performance degrades earlier than Pinecone/Milvus at scale. For this system's scale (< 10K documents), HNSW indexing in pgvector is more than sufficient. If the document corpus grows beyond 1M vectors, migrating to a dedicated vector DB is a well-understood operation.

### Why SHA256 exact-match cache instead of semantic similarity?

**Decision:** Medical queries have strict safety requirements. "I have a headache" and "I have a headache with neck stiffness" are clinically very different — a semantic cache might conflate them. SHA256 exact match is conservative but zero-risk.

**Trade-off:** Lower cache hit rate than semantic matching. Mitigation: 2-5 minute TTLs are short enough that repeated queries (same patient asking follow-ups) still hit. If hit rate is too low, the next step is query normalization (strip filler words, standardize terms) before hashing — not semantic matching.

### Why store API keys in the database (encrypted) instead of env vars?

**Decision:** Admin UI allows changing LLM providers, API keys, and models at runtime without redeployment or restart. Fernet encryption at rest.

**Trade-off:** Every LLM call requires a DB query to fetch the provider config. Mitigation: provider config is resolved once per LLMService instance and cached for the instance lifetime. The cost is ~1ms DB query per new service instance, negligible compared to LLM latency.

---

## Benchmarks

*Tested against local Docker deployment. 3 real-world scenarios × 3 concurrency levels, 180 total requests.*

### Throughput & Latency

| Scenario | Concurrency | P50 | P95 | P99 | Throughput |
|:---------|:-----------:|----:|----:|----:|----------:|
| Greeting (cache hit) | 10 | 147ms | 290ms | 291ms | 56 req/s |
| Symptom inquiry (cache hit) | 10 | 130ms | 134ms | 134ms | 76 req/s |
| Complex Dx (cache hit) | 10 | 126ms | 132ms | 137ms | 75 req/s |
| Raw LLM (cache miss) | 1 | ~1,500ms | ~2,800ms | ~3,200ms | ~5 req/s |

### Key Metrics

| Metric | Value |
|:-------|:------|
| Cache speedup | **10–20× latency reduction** |
| Peak throughput | **78 req/s** (warm cache) |
| Error rate | **0%** (180/180 success) |
| Rate limiting | 429 at threshold, correct Retry-After |

---

## Diagnosis Quality Evaluation

*LLM-as-a-Judge on 30 medical test cases (10 simple FAQ, 10 symptom inquiry, 10 complex differential diagnosis). Scored on faithfulness, completeness, and safety (1–5).*

### Results

| Metric | Score | Notes |
|:-------|:-----:|:------|
| **Faithfulness** | **4.87 / 5** | Near-zero fabrication; medical claims are accurate |
| **Completeness** | **4.60 / 5** | Covers expected clinical aspects; occasional omissions on edge cases |
| **Safety** | **4.70 / 5** | Consistent warnings, red flags, "when to see doctor" guidance |
| **Overall** | **4.72 / 5** | 30/30 evaluations completed, 0 failures |

| Category | Faithfulness | Completeness | Safety | Overall |
|:---------|:------------:|:------------:|:------:|:-------:|
| Simple (health FAQ) | 5.00 | 4.70 | 4.90 | **4.87** |
| Symptom inquiry | 5.00 | 4.40 | 4.80 | **4.73** |
| Complex (differential Dx) | 4.60 | 4.70 | 4.40 | **4.57** |

Complex cases score lower — expected, as differential diagnosis involves probabilistic reasoning. Safety scores dip on complex cases because responses prioritize clinical detail over explicit disclaimers. This is a known trade-off.

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| API Server | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Celery |
| LLM | OpenAI-compatible provider layer (DeepSeek), function calling, structured JSON output |
| Database | PostgreSQL 17 + pgvector (HNSW indexing) |
| Cache / Queue / Metrics | Redis 7 |
| External Search | SearXNG (self-hosted, privacy-preserving) |
| Frontend | React 19, TypeScript, Vite 8, MUI 9 |
| Deployment | Docker Compose, Nginx, GitHub Actions CI/CD |

---

## Quick Start

```bash
git clone https://github.com/HougeLangley/MediCareAI-Agent.git
cd MediCareAI-Agent
cp .env.example .env
# Edit .env: add DEEPSEEK_API_KEY, set SECRET_KEY

docker compose up -d
```

| Service | URL |
|:--------|:----|
| Frontend | http://localhost:3000 |
| API Docs | http://localhost:8000/docs |
| Admin | http://localhost:3000/admin |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/v1/           # REST + SSE endpoints
│   │   ├── core/              # config, security, metrics, rate_limiter
│   │   ├── services/          # llm, agents, orchestrator, cache, intent_router
│   │   ├── models/            # SQLAlchemy models
│   │   └── db/                # session, migrations, redis
│   └── tests/
├── frontend/
│   └── src/                   # patient / doctor / admin portals
├── scripts/
│   ├── benchmark.py           # Load testing (3 scenarios × 3 concurrency)
│   ├── evaluate.py            # LLM-as-Judge quality evaluation
│   └── eval_dataset.json      # 30 medical test cases
├── .github/workflows/ci.yml   # CI/CD: lint → test → build → eval → scan
└── docker-compose.yml
```

---

## What This Project Is (and Isn't)

**Is:**
- A structured clinical interview system that models real medical workflow
- Production-grade LLM infrastructure with observability, caching, rate limiting
- Benchmarked for latency, throughput, and diagnosis quality with real data

**Isn't:**
- A deployed product with real patients or doctors
- A replacement for medical training or clinical judgment
- FDA-approved or clinically validated

---

## License

[MIT](LICENSE) © 2026 Houge Langley
