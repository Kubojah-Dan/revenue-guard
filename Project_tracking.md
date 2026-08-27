# Revenue Process Twin — Build Handoff
*Reconciles: Daniel's dataset/schema email + SYSTEM_DESIGN_v2_Revenue_Process_Twin.docx*
*You own: Data Engineering + AI/ML + Rules + API (the entire backend). Teammate owns: React/TS frontend.*

---

## 0. Architecture Recap (so both of you build against the same mental model)

```
PUBLIC DATASETS
      ↓
Data Engineering (you)
      ↓
UNIFIED DB (SQLite)  ── customers, invoices, payments, transactions, renewals,
      ↓                  event_log, alerts, audit_log
Event Log Builder
      ↓
Conformance Engine (GF01–GF08)  +  Graph Leakage Engine (GH01–GH05)  +  Detection Rules (R01–R11) + ML
      ↓
Counterfactual Action Engine (CF01–CF08)
      ↓
FastAPI (7 endpoints)
      ↓
Tiny LLM Narrator (chat only, evidence-grounded)
      ↓
React Dashboard (teammate)
```

**Non-negotiable principles from the design doc (v2):**
- **Single source of truth** — one unified DB, nothing else duplicates it.
- **Process-first detection** — leaks are deviations from an expected invoice→payment→renewal flow, not just bad rows.
- **Financial precision** — ALL money is `INTEGER` paise, end-to-end. Never float. ₹ formatting happens only in the UI.
- **Deterministic core** — conformance rules, graph heuristics, counterfactual templates are plain auditable Python, not LLM guesses.
- **LLM = narrator only** — it receives pre-computed evidence JSON and writes English. It never scores, detects, or decides anything.
- **Every alert must carry**: customer, rule/flow id, leak type, severity, ₹ amount, machine-readable evidence, status.
- **Every action is audited** — append-only `audit_log`.

---

## 1. API Contract — Routes Your Frontend Teammate Connects To

These are the **7 contract endpoints** (Section 3.7 of the design doc). Freeze these shapes on Day 0 — your teammate builds the entire UI against this contract (plus a frozen `mock_api.json`, see Section 3.9) without waiting on your backend to be live.

| # | Method | Route | Purpose |
|---|--------|-------|---------|
| 1 | `GET` | `/api/alerts` | Paginated list of all leakage alerts |
| 2 | `GET` | `/api/customer/{id}/risk` | Customer risk score (0–100) + contributing factors |
| 3 | `GET` | `/api/customer/{id}/explain` | Full evidence: conformance deviations, graph links, counterfactual, rule traces |
| 4 | `GET` | `/api/recoverable-summary` | Aggregate recoverable ₹ by leak type / severity / time period |
| 5 | `POST` | `/api/chat` | `{ query }` → narrator explanation + evidence JSON |
| 6 | `POST` | `/api/actions/execute` | Executes an approved counterfactual action; appends to `audit_log` |
| 7 | `GET` | `/api/health` | Liveness check |

### 1.1 `GET /api/alerts`
```
Query params: ?page=1&page_size=25&severity=critical&status=open&customer_id=CUST-0042
```
```json
{
  "page": 1,
  "page_size": 25,
  "total": 132,
  "alerts": [
    {
      "alert_id": "ALT-00042",
      "customer_id": "CUST-0042",
      "customer_name": "Acme Corp",
      "rule_id": "R03",
      "leak_type": "over_discount",
      "severity": "critical",
      "leak_amount_rs": 420000,
      "recoverable_rs": 315000,
      "process_break_step": "DISCOUNT_APPLIED",
      "expected_next": "DISCOUNT_APPROVED",
      "actual_next": "INVOICE_ISSUED",
      "recommended_action": "Normalize discount from 68% to 12% median",
      "status": "open",
      "created_at": "2026-08-20T10:15:00Z"
    }
  ]
}
```

### 1.2 `GET /api/customer/{id}/risk`
```json
{
  "customer_id": "CUST-0042",
  "risk_score": 78,
  "conformance_deviation_score": 0.62,
  "churn_probability": 0.35,
  "contributing_factors": [
    { "factor": "GF02 discount approval gate violated", "weight": 0.4 },
    { "factor": "3 invoices over plan median discount", "weight": 0.22 }
  ]
}
```

### 1.3 `GET /api/customer/{id}/explain`
```json
{
  "customer_id": "CUST-0042",
  "conformance_deviations": [
    { "rule_id": "GF02", "process_break_step": "DISCOUNT_APPLIED",
      "expected_next": "DISCOUNT_APPROVED", "actual_next": "INVOICE_ISSUED",
      "deviation_type": "MISSING_APPROVAL", "leak_amount_rs": 420000,
      "evidence": "Discount 68% applied on 2025-03-12 without approval record." }
  ],
  "graph_links": {
    "heuristic": "GH01",
    "connected_entities": ["INV-1004", "INV-1007", "INV-1009", "Approver: AP-03"]
  },
  "counterfactual": {
    "cf_id": "CF02",
    "statement": "If discount normalized from 68% to 12% → invoice amount increases by ₹3.8L.",
    "estimated_recovery_rs": 380000,
    "confidence": 0.75
  },
  "rule_traces": ["R03", "R11"]
}
```

### 1.4 `GET /api/recoverable-summary`
```
Query params: ?period=30d&group_by=leak_type
```
```json
{
  "total_leakage_rs": 1840000,
  "total_recoverable_rs": 1120500,
  "active_alerts": 132,
  "avg_risk_score": 54,
  "by_leak_type": [
    { "leak_type": "over_discount", "leakage_rs": 420000, "recoverable_rs": 315000, "count": 3 },
    { "leak_type": "duplicate_payment", "leakage_rs": 120000, "recoverable_rs": 120000, "count": 1 }
  ]
}
```

### 1.5 `POST /api/chat`
Request:
```json
{ "query": "Why is Acme Corp losing revenue?" }
```
Response (exact shape from design doc §2.3.2):
```json
{
  "answer": "Acme Corp applied a 68% discount without approval on 3 invoices, breaking the discount-approval gate. Estimated leak: ₹4.2L. Normalizing the discount to the 12% plan median recovers approximately ₹3.8L.",
  "leak_amount_rs": 420000,
  "process_break": "DISCOUNT_APPLIED without DISCOUNT_APPROVED",
  "connected_entities": ["INV-1004", "INV-1007", "INV-1009"],
  "recommended_action": "Normalize discount to plan median (12%)",
  "recovery_estimate_rs": 380000
}
```

### 1.6 `POST /api/actions/execute`
Request:
```json
{ "alert_id": "ALT-00042", "action": "mark_re_invoiced", "actor": "user" }
```
Response:
```json
{ "status": "success", "audit_log_id": 981, "executed_at": "2026-08-27T14:32:00Z" }
```

### 1.7 `GET /api/health`
```json
{ "status": "ok", "db": "connected", "model_loaded": true, "narrator_mode": "live" }
```

### 1.8 Shared TypeScript interfaces (give this file to your teammate verbatim)
```ts
export interface AlertRecord {
  alert_id: string;
  customer_id: string;
  customer_name: string;
  rule_id: string;               // R01-R11 | GF01-GF08 | GH01-GH05
  leak_type: string;
  severity: "critical" | "high" | "medium" | "low";
  leak_amount_rs: number;
  recoverable_rs: number;
  process_break_step: string | null;
  expected_next: string | null;
  actual_next: string | null;
  recommended_action: string;
  status: "open" | "acknowledged" | "resolved";
  created_at: string;
}

export interface CustomerRisk {
  customer_id: string;
  risk_score: number; // 0-100
  conformance_deviation_score: number;
  churn_probability: number;
  contributing_factors: { factor: string; weight: number }[];
}

export interface CounterfactualAction {
  cf_id: string;
  statement: string;
  estimated_recovery_rs: number;
  confidence: number;
}

export interface ChatResponse {
  answer: string;
  leak_amount_rs: number;
  process_break: string;
  connected_entities: string[];
  recommended_action: string;
  recovery_estimate_rs: number;
}
```

### 1.9 Demo-safety contract (do this on Day 0, not Day 3)
Freeze a `mock_api.json` with real-looking responses for all 7 routes above. Give it to your frontend teammate immediately so they wire up MSW (Mock Service Worker) and build the **entire UI against mock data**, independent of your backend being finished. This is explicitly called out in the design doc as the parallel-build contract — do not skip it.

---

## 2. Master Backend Build Prompt (Data + AI/ML + Rules) — Paste This Into Your Coding Agent

> Copy everything in the box below into Claude Code / Cursor / etc. as your working brief. It is self-contained.

```
You are building the COMPLETE backend for "Revenue Process Twin" — a revenue
leakage detection system — per SYSTEM_DESIGN_v2_Revenue_Process_Twin.docx.
You own: data engineering, the detection engine (rules + ML), the conformance
engine, the graph leakage engine, the counterfactual engine, the tiny-LLM
narrator, and the FastAPI layer. Frontend is being built in parallel by a
teammate against a frozen mock_api.json and TypeScript interfaces — do not
break the response shapes defined in the API contract below.

═══════════════════════════════════════════════════════════════
PRINCIPLES (non-negotiable)
═══════════════════════════════════════════════════════════════
- Single unified SQLite DB is the only source of truth. No engine duplicates it.
- ALL money is INTEGER paise end-to-end. Never float. ₹ formatting is a UI concern only.
- Detection is process-first: model the expected invoice→payment→renewal
  lifecycle as an event log, then flag deviations — not just row anomalies.
- Conformance rules, graph heuristics, and counterfactual templates must be
  deterministic, auditable, pure Python functions — unit-testable in isolation.
- The LLM (Phi-4-mini 3.8B or Llama 3.1 8B via Ollama) is ONLY a narrator for
  /api/chat. It receives structured evidence JSON and writes ≤150 words of
  plain English. It never computes scores or invents figures. If evidence is
  incomplete, it says "insufficient data."
- Every alert row must contain: customer, rule/flow id, leak type, severity,
  ₹ amount, machine-readable evidence_json, status.
- Every executed action is appended to an append-only audit_log with actor,
  timestamp, rule_id/action_type.
- Provide a NARRATOR_MODE=mock env var that returns a deterministic
  template-filled string instead of calling the LLM, so detection/scoring/
  counterfactual logic is demo-safe even if the model server is down.

═══════════════════════════════════════════════════════════════
1. UNIFIED DATABASE SCHEMA (schema.sql — authoritative)
═══════════════════════════════════════════════════════════════
CREATE TABLE customers (
    customer_id     TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    segment         TEXT NOT NULL,              -- e.g. enterprise, smb
    plan            TEXT NOT NULL,
    plan_mrr_paise  INTEGER NOT NULL,
    created_at      TEXT NOT NULL,               -- ISO-8601
    region          TEXT NOT NULL
);

CREATE TABLE invoices (
    invoice_id      TEXT PRIMARY KEY,
    customer_id     TEXT NOT NULL REFERENCES customers(customer_id),
    issue_date      TEXT NOT NULL,
    due_date        TEXT NOT NULL,
    amount_paise    INTEGER NOT NULL,
    discount_pct    REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL,               -- issued|paid|overdue|void|disputed|partially_paid
    contract_ref    TEXT
);

CREATE TABLE payments (
    payment_id      TEXT PRIMARY KEY,
    invoice_id      TEXT NOT NULL REFERENCES invoices(invoice_id),
    customer_id     TEXT NOT NULL REFERENCES customers(customer_id),
    amount_paise    INTEGER NOT NULL,
    method          TEXT NOT NULL,               -- upi|card|netbanking|wire
    status          TEXT NOT NULL,               -- success|failed|refunded|duplicate|chargeback
    payment_ts      TEXT,
    attempt_no      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE transactions (
    txn_id          TEXT PRIMARY KEY,
    customer_id     TEXT NOT NULL REFERENCES customers(customer_id),
    amount_paise    INTEGER NOT NULL,
    type            TEXT NOT NULL,               -- purchase|refund|chargeback|adjustment
    txn_ts          TEXT NOT NULL
);

CREATE TABLE renewals (
    renewal_id      TEXT PRIMARY KEY,
    customer_id     TEXT NOT NULL REFERENCES customers(customer_id),
    due_date        TEXT NOT NULL,
    status          TEXT NOT NULL,               -- renewed|missed|failed_payment|pending
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    last_attempt_ts TEXT
);

CREATE TABLE event_log (
    event_id        TEXT PRIMARY KEY,
    entity_id       TEXT NOT NULL,               -- customer_id / invoice_id / renewal_id
    entity_type     TEXT NOT NULL,               -- customer|invoice|renewal|payment
    event_type      TEXT NOT NULL,               -- see event type list below
    event_ts        TEXT NOT NULL,
    metadata_json   TEXT,
    created_at      TEXT NOT NULL
);

CREATE TABLE alerts (
    alert_id                TEXT PRIMARY KEY,
    customer_id             TEXT NOT NULL REFERENCES customers(customer_id),
    rule_id                 TEXT NOT NULL,       -- R01-R11 | GF01-GF08 | GH01-GH05
    leak_type               TEXT NOT NULL,
    severity                TEXT NOT NULL,       -- critical|high|medium|low
    leak_amount_paise       INTEGER NOT NULL,
    recoverable_paise       INTEGER NOT NULL,
    process_break_step      TEXT,
    expected_next           TEXT,
    actual_next             TEXT,
    connected_entities_json TEXT,
    recommended_action      TEXT,
    action_confidence       REAL,
    evidence_json           TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'open',   -- open|acknowledged|resolved
    created_at              TEXT NOT NULL
);

CREATE TABLE audit_log (
    log_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id        TEXT,
    action_type     TEXT NOT NULL,
    actor           TEXT NOT NULL,               -- user|system|agent
    payload_json    TEXT NOT NULL,
    executed_at     TEXT NOT NULL,
    outcome         TEXT
);

-- Indexes
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_transactions_customer_date ON transactions(customer_id, txn_ts);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_renewals_customer ON renewals(customer_id);
CREATE INDEX idx_renewals_status ON renewals(status);
CREATE INDEX idx_alerts_customer ON alerts(customer_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_event_log_entity ON event_log(entity_id, event_ts);

═══════════════════════════════════════════════════════════════
2. SOURCE DATASETS → TABLE MAPPING
═══════════════════════════════════════════════════════════════
Staging files will be handed to you at data/staging/ (see download steps doc):
  online_retail_ii.csv  (D1, UCI Online Retail II)  → customers, invoices,
                                                        payments, transactions
                                                        backbone (convert
                                                        GBP→INR→paise;
                                                        InvoiceNo starting
                                                        with 'C' = cancellation
                                                        → refund transaction)
  telco_churn.csv        (D3, IBM Telco)             → TRAIN ONLY the XGBoost
                                                        churn model. Never
                                                        load into production
                                                        tables directly —
                                                        apply the learned
                                                        relationship to your
                                                        own customers/
                                                        transactions data.
  saas.csv               (D4, SaaS Subscription)     → plan structure,
                                                        renewal cadence,
                                                        renewals table shape
  late_payment.csv        (D6, IBM Factoring)        → DO NOT copy rows.
                                                        Extract the lateness
                                                        (due_date→paid_at gap)
                                                        DISTRIBUTION and sample
                                                        from it when
                                                        synthesizing overdue
                                                        invoices/payments.
  msme.csv                (D7, MSME Invoices)        → Indian company names,
                                                        region/business
                                                        context for customers

═══════════════════════════════════════════════════════════════
3. EVENT LOG BUILDER
═══════════════════════════════════════════════════════════════
Build a Python/pandas job that reads customers, invoices, payments,
transactions, renewals and emits ordered event_log rows per entity.

Event types to emit:
CONTRACT_APPROVED, INVOICE_ISSUED, DISCOUNT_APPLIED, DISCOUNT_APPROVED,
PAYMENT_ATTEMPTED, PAYMENT_SUCCEEDED, PAYMENT_FAILED, RENEWAL_DUE,
RENEWAL_SUCCEEDED, RENEWAL_MISSED, REFUND_ISSUED, CHARGEBACK_RAISED,
USAGE_DECLINE_FLAGGED

═══════════════════════════════════════════════════════════════
4. CONFORMANCE ENGINE (Golden Flows GF01–GF08)
═══════════════════════════════════════════════════════════════
Implement each as an independently unit-testable pure function operating on
event_log sequences per entity:

GF01 Invoice Payment SLA      | INVOICE_ISSUED → PAYMENT_SUCCEEDED within 30d      | Overdue Invoice
GF02 Discount Approval Gate   | DISCOUNT_APPLIED → DISCOUNT_APPROVED before ISSUED | Unapproved Discount
GF03 Renewal Lifecycle        | RENEWAL_DUE → reminder ≤7d → RENEWAL_SUCCEEDED ≤30d| Missed Renewal
GF04 Refund Trigger Validity  | REFUND_ISSUED must map to a valid PAYMENT_SUCCEEDED| Spurious Refund
GF05 Duplicate Payment Guard  | Only one PAYMENT_SUCCEEDED per INVOICE_ISSUED      | Duplicate Payment
GF06 Enterprise Contract Gate | Discount >20% on enterprise plan → CONTRACT_REF req| Contract-less Enterprise Discount
GF07 Failed Renewal Recovery  | PAYMENT_FAILED on renewal → retry ≤3d, max 3 tries | Failed Renewal Recovery Gap
GF08 Revenue Continuity       | Monthly revenue/customer must not decline >20% for | Silent Churn
                                 3+ consecutive months without CHURN_RISK_FLAG

Scoring: conformance_score(customer) = 1 - (weighted_deviation_count / total_expected_steps)
Each deviation writes structured evidence, e.g.:
{ "rule_id":"GF02","entity_id":"CUST-0042","process_break_step":"DISCOUNT_APPLIED",
  "expected_next":"DISCOUNT_APPROVED","actual_next":"INVOICE_ISSUED",
  "deviation_type":"MISSING_APPROVAL","leak_amount_paise":42000000,
  "evidence":"Discount 68% applied on 2025-03-12 without approval record." }

═══════════════════════════════════════════════════════════════
5. GRAPH LEAKAGE ENGINE (NetworkX, Neo4j-compatible schema)
═══════════════════════════════════════════════════════════════
Nodes: Customer, Invoice, Payment, Renewal, Refund, DiscountApprover, SalesPerson
Edges: Customer→Invoice(HAS_INVOICE), Invoice→Payment(SETTLED_BY),
       Customer→Renewal(HAS_RENEWAL), Invoice→Refund(TRIGGERED_REFUND),
       Invoice→DiscountApprover(APPROVED_BY, missing edge = unapproved),
       SalesPerson→Invoice(ISSUED_BY)

Heuristics (GH01–GH05):
GH01 Approver Discount Cluster   | 1 approver linked to ≥3 invoices with discount > plan median+2σ
GH02 Refund Cluster Post-Upgrade | ≥3 refunds within 60d of a plan upgrade, same customer
GH03 Duplicate Payment Structure | same amount_paise + invoice_id → 2+ PAYMENT_SUCCEEDED edges
GH04 Salesperson Discount Pattern| 1 salesperson linked to ≥5 invoices with discount >30% in 90d
GH05 Multi-hop Churn Risk        | 3+ consecutive usage declines AND renewal missed AND >1 failed payment

Build in-memory from SQLite on startup. Provide SQL-join fallback for each
heuristic in case NetworkX isn't wired in time.

═══════════════════════════════════════════════════════════════
6. COUNTERFACTUAL ACTION ENGINE (CF01–CF08)
═══════════════════════════════════════════════════════════════
For every alert, compute the MINIMAL intervention that flips loss→recovered:

CF01 (GF01/R01) Reissue invoice + reminder within 5d of overdue     → recovery = leak × 0.33
CF02 (GF02/R03) Normalize discount to plan median                  → recovery = discount_gap × invoice_count
CF03 (GF03/R05) Renewal reminder 14d before due date                → recovery = mrr × 12 × 0.82
CF04 (GF04/R04) Enforce refund threshold policy (>15% lifetime)     → recovery = blocked_refund_total
CF05 (GF05/R02) Duplicate-payment guard at processor                → recovery = duplicate_amount × 1.00
CF06 (GF06/R11) Enforce CONTRACT_REF gate before invoice issue      → recovery = unapproved_discount_amount
CF07 (GF07/R06) Retry failed renewal within 3d (max 3 attempts)     → recovery = renewal_value × 0.61
CF08 (GF08/R09) Retention outreach after 2nd consecutive decline mo → recovery = ltv × churn_reduction_delta

Recovery probability table (use exactly):
  Duplicate Payment              1.00  (High — deterministic reversal)
  Unapproved / Over-Discount     0.75  (High — policy enforcement)
  Enterprise Contract-less Disc. 0.70  (High — gate enforcement)
  Failed Renewal (retry path)    0.61  (Medium)
  Missed Renewal                 0.40  (Medium)
  Invoice Overdue                0.33  (Medium — collection probability)
  Refund Excess                  0.50  (Medium)
  Silent Churn / Revenue Decline 0.25  (Low — retention uncertainty)

recoverable_paise(alert) = leak_amount_paise × recovery_probability(leak_type)
Round to nearest paise, never float arithmetic on the final stored value.

═══════════════════════════════════════════════════════════════
7. DETECTION RULES ENGINE (R01–R11, pure functions, unit-tested)
═══════════════════════════════════════════════════════════════
R01 Invoice Overdue        | due_date<today AND status≠'paid' AND days_overdue>30
R02 Duplicate Payment      | COUNT(payments WHERE invoice_id=X AND status='success')>1
R03 Outlier Discount       | discount_pct > plan_median + 3×IQR(plan_discounts)
R04 High Refund Ratio      | SUM(refunds)/SUM(lifetime_purchases) > 0.15
R05 Missed Renewal         | due_date<today AND status='missed'
R06 Failed Renewal Payment | attempts≥2 AND status='failed'
R07 Missed Invoice         | invoice has no matching payment record at all
R08 Duplicate Invoice      | same customer+amount+date within ±3d, 2+ records
R09 Revenue Decline        | 3+ consecutive months revenue_delta<-20% vs prior month
R10 Chargeback Spike       | >2 chargebacks/adjustments within 90d for one customer
R11 Contract-less Ent.Disc.| segment='enterprise' AND discount>20% AND contract_ref IS NULL

ML models:
  - Isolation Forest (contamination=0.05) on normalized [discount_pct_zscore,
    payment_latency_days, refund_ratio, invoice_amount_zscore] → anomaly_score,
    flags outliers R01-R11 miss. scikit-learn.
  - XGBoost (Logistic Regression fallback) trained on IBM Telco Churn features
    (days_since_last_purchase, revenue_decline_streak, failed_payment_count,
    refund_ratio, renewal_miss_count, plan_mrr, support_tickets) →
    churn_probability [0,1]. Precompute SHAP (TreeExplainer) and store top
    features in alert evidence_json.

═══════════════════════════════════════════════════════════════
8. SCORING FORMULAS (exact — frontend depends on these matching)
═══════════════════════════════════════════════════════════════
risk_score = round( 0.6 × conformance_deviation_score × 100
                   + 0.4 × churn_probability × 100 )
(if conformance engine isn't ready yet, use a rule-violation-derived interim
 proxy for conformance_deviation_score — e.g. severity-weighted fraction of
 R01-R11 triggered — and swap it in once GF01-08 is live; keep the 60/40 split)

Severity bands (paise):
  critical >= 20,000,000   (₹2,00,000)
  high     >= 5,000,000    (₹50,000)
  medium   >= 1,000,000    (₹10,000)
  low      <  1,000,000

═══════════════════════════════════════════════════════════════
9. TINY LLM NARRATOR (/api/chat only)
═══════════════════════════════════════════════════════════════
def narrator(evidence_json: dict, query: str) -> str:
    # Swappable: Ollama (Phi-4-mini-instruct 3.8B default, or Llama 3.1 8B) →
    # OpenAI-compatible API fallback for demo safety.
    ...

System prompt rules:
  - Only use facts from the provided evidence JSON. Never hallucinate figures.
  - Always state the ₹ amount, the process break point, and the recommended action.
  - If evidence is incomplete, say "insufficient data" — do not infer.
  - Max 150 words.
Env var NARRATOR_MODE=mock → returns a deterministic template-filled string,
bypassing the LLM entirely (demo safety net).

═══════════════════════════════════════════════════════════════
10. FASTAPI — IMPLEMENT EXACTLY THESE 7 ROUTES
═══════════════════════════════════════════════════════════════
GET  /api/alerts
GET  /api/customer/{id}/risk
GET  /api/customer/{id}/explain
GET  /api/recoverable-summary
POST /api/chat
POST /api/actions/execute
GET  /api/health
(Use the exact JSON response shapes in the API Contract doc — do not rename
fields; the frontend's TypeScript interfaces and MSW mocks depend on them.)
Enable CORS for the frontend origin. Keep controllers thin — all logic in a
services/ layer (event_log_builder, conformance_engine, graph_engine,
counterfactual_engine, detection_rules, ml_models, narrator).

═══════════════════════════════════════════════════════════════
11. DETERMINISTIC DEMO SEED LEAKS (inject these exactly — non-negotiable)
═══════════════════════════════════════════════════════════════
S01 Acme Corp (CUST-0042)   | Over-Discount 55-68% vs 12% plan median, 11 invoices
                              | Triggers GF02+R03+GH01 | CRITICAL | ~₹3.8-4.2L
S02 Vertex Ltd (CUST-0108)  | Duplicate payment on one invoice (2 successful pays)
                              | Triggers GF05+R02+GH03 | HIGH | ₹1.2L
S03 Neon Retail (CUST-0077) | 3 consecutive months revenue decline >20% + missed
                              renewal | Triggers GF08+R09+GH05 | HIGH | ~₹2.1L (LTV)
S04 BlueStar (CUST-0031)    | Enterprise discount without contract_ref
                              | Triggers GF06+R11 | MEDIUM | ₹45K
(Optional extra churn-rescue demo customer, from earlier draft: CUST-0107 with
 6 months of -20%/mo declining transactions, refund ratio 9%, churn_probability
 >=0.90 — useful if you want a 4th distinct chat-demo story for GF08+ML.)

═══════════════════════════════════════════════════════════════
12. VALIDATION GATE (run before declaring the DB "done")
═══════════════════════════════════════════════════════════════
V1: customers>=200, invoices>=1000, payments>=800, events>=3000
V2: no orphan invoices (every invoice_id in payments exists in invoices)
V3: seed leak S01 produces CRITICAL alert with leak_amount >= ₹3L
V4: conformance engine flags GF02 on CUST-0042 within 500ms
V5: counterfactual CF02 output for CUST-0042 states recovery >= ₹3.5L

═══════════════════════════════════════════════════════════════
13. DELIVERABLE PACKAGE (what you hand off / commit)
═══════════════════════════════════════════════════════════════
data/staging/*.csv     — cleaned source CSVs
data/final/revenue_leaks.db  — built SQLite DB
schema.sql             — authoritative schema (source of truth, keep in sync)
build_db.py            — one script: staging CSVs → final DB, idempotent
DATA_DICTIONARY.md     — every column, meaning, allowed values, units
PROVENANCE.md          — which dataset fed which table/field, transforms applied
mock_api.json          — frozen example responses for all 7 routes (Day 0 deliverable)
ml/*.pkl               — trained XGBoost + Isolation Forest models
tests/                 — unit tests per rule (R01-R11), per golden flow (GF01-08),
                          per counterfactual template (CF01-08)

BUILD ORDER (rough time-boxing if solo):
  Phase 0: schema.sql + seed/staging data + mock_api.json + TS interfaces
  Phase 1: Event Log Builder, Conformance Engine (GF01-08), R01-R11 rules
  Phase 2: Counterfactual Engine (CF01-08), risk_score, recoverable ₹ calc
  Phase 3: FastAPI 7 endpoints wired to real DB + Isolation Forest
  Phase 4: XGBoost churn + SHAP, Tiny LLM Narrator (/chat), Validation Gate V1-V5

Now build it. Ask me before making any change that would alter a response
shape in the API Contract, since the frontend is being developed in parallel
against those exact shapes.
```

---

## 3. Manual Dataset Download Steps

You cannot script-download Kaggle/UCI datasets from a sandboxed backend build environment without credentials, so do this manually once and drop the files into `backend/data/raw/`.

### 3.1 D1 — UCI Online Retail II (primary backbone)
1. Go to: `https://archive.ics.uci.edu/dataset/502/online+retail+ii`
2. Click **Download** (top right) → downloads a `.zip` containing `online_retail_II.xlsx` (two sheets: "Year 2009-2010", "Year 2010-2011").
3. Unzip it, open in Excel/pandas, and combine both sheets into one CSV:
   ```python
   import pandas as pd
   df1 = pd.read_excel("online_retail_II.xlsx", sheet_name="Year 2009-2010")
   df2 = pd.read_excel("online_retail_II.xlsx", sheet_name="Year 2010-2011")
   pd.concat([df1, df2]).to_csv("online_retail_ii.csv", index=False)
   ```
4. Place the result at `backend/data/staging/online_retail_ii.csv`.
   *(Optional CLI alternative: `pip install ucimlrepo` → `from ucimlrepo import fetch_ucirepo; fetch_ucirepo(id=502)`.)*

### 3.2 D3 — IBM Telco Customer Churn (Kaggle)
1. Create a free Kaggle account if you don't have one.
2. Go to **Account settings → API → Create New Token** → downloads `kaggle.json`.
3. On your machine:
   ```bash
   mkdir -p ~/.kaggle
   mv ~/Downloads/kaggle.json ~/.kaggle/kaggle.json
   chmod 600 ~/.kaggle/kaggle.json
   pip install kaggle
   ```
4. Download:
   ```bash
   kaggle datasets download -d blastchar/telco-customer-churn
   unzip telco-customer-churn.zip -d .
   ```
5. Rename the CSV to `telco_churn.csv`, place in `backend/data/staging/`.
   *(Or manually: open the Kaggle page → click Download button in browser.)*

### 3.3 D4 — SaaS Subscription & Churn Analytics (Kaggle)
```bash
kaggle datasets download -d rivalytics/saas-subscription-and-churn-analytics-dataset
unzip saas-subscription-and-churn-analytics-dataset.zip -d .
```
Rename to `saas.csv` → `backend/data/staging/`.

### 3.4 D6 — Finance Factoring / IBM Late Payment Histories (Kaggle)
```bash
kaggle datasets download -d hhenry/finance-factoring-ibm-late-payment-histories
unzip finance-factoring-ibm-late-payment-histories.zip -d .
```
Rename to `late_payment.csv` → `backend/data/staging/`.

### 3.5 D7 — MSME Invoices & Transactions (Kaggle)
```bash
kaggle datasets download -d kiruthikas005/msme-invoices-and-transactions
unzip msme-invoices-and-transactions.zip -d .
```
Rename to `msme.csv` → `backend/data/staging/`.

### 3.6 Backups (only if you need them)
| Dataset | Slug / URL | Use case |
|---|---|---|
| D2 — UCI Online Retail (original) | `archive.ics.uci.edu/dataset/352/online+retail` | Lighter fallback if D1 is too heavy to process |
| D5 — Synthetic SaaS Subscription | `kaggle datasets download -d ansarimuzammil/synthetic-saas-subscription-dataset` | If D4 lacks enough renewal/plan detail |
| D8 — Global B2B Invoice & Payments | `kaggle datasets download -d tharishreddy22/global-b2b-invoice-and-payments-dataset` | Backup B2B invoice context |

### 3.7 After all 5 files are in `data/staging/`
Run your `build_db.py` (from the master prompt, Section 13) to transform staging CSVs → `data/final/revenue_leaks.db` per the schema in Section 1. Keep `data/raw/` (the original zips/xlsx) out of git via `.gitignore` — they're large and re-downloadable; only staging CSVs and the final `.db` need to be tracked or shared.

---

## 4. Overall Project Structure (Monorepo)

```
revenue-process-twin/
│
├── backend/                          # ← YOU own everything here
│   ├── app/
│   │   ├── main.py                   # FastAPI app entrypoint, CORS setup
│   │   ├── api/
│   │   │   ├── routes_alerts.py      # GET /api/alerts
│   │   │   ├── routes_customer.py    # GET /api/customer/{id}/risk, /explain
│   │   │   ├── routes_summary.py     # GET /api/recoverable-summary
│   │   │   ├── routes_chat.py        # POST /api/chat
│   │   │   ├── routes_actions.py     # POST /api/actions/execute
│   │   │   └── routes_health.py      # GET /api/health
│   │   ├── services/
│   │   │   ├── event_log_builder.py
│   │   │   ├── conformance_engine.py     # GF01-GF08
│   │   │   ├── graph_engine.py           # GH01-GH05 (NetworkX)
│   │   │   ├── counterfactual_engine.py  # CF01-CF08
│   │   │   ├── detection_rules.py        # R01-R11
│   │   │   ├── ml_models.py              # XGBoost + Isolation Forest
│   │   │   └── narrator.py               # Tiny LLM (Ollama) + mock mode
│   │   ├── models/                   # Pydantic request/response schemas
│   │   └── db/
│   │       └── connection.py
│   ├── data/
│   │   ├── raw/                      # original downloads (gitignored)
│   │   ├── staging/                  # cleaned CSVs (see Section 3)
│   │   │   ├── online_retail_ii.csv
│   │   │   ├── telco_churn.csv
│   │   │   ├── saas.csv
│   │   │   ├── late_payment.csv
│   │   │   └── msme.csv
│   │   └── final/
│   │       └── revenue_leaks.db      # built unified DB (source of truth)
│   ├── ml/
│   │   ├── train_churn_model.py
│   │   ├── train_isolation_forest.py
│   │   └── models/                   # *.pkl artifacts
│   ├── tests/
│   │   ├── test_rules.py             # R01-R11
│   │   ├── test_conformance.py       # GF01-GF08
│   │   ├── test_graph.py             # GH01-GH05
│   │   └── test_counterfactual.py    # CF01-CF08
│   ├── build_db.py                   # staging CSVs → final DB
│   ├── schema.sql                    # authoritative schema
│   ├── DATA_DICTIONARY.md
│   ├── PROVENANCE.md
│   ├── mock_api.json                 # frozen Day-0 response shapes
│   └── requirements.txt
│
├── frontend/                         # ← Teammate owns everything here
│   ├── src/
│   │   ├── api/apiClient.ts          # fetch wrappers for the 7 routes
│   │   ├── types/interfaces.ts       # AlertRecord, CustomerRisk, etc. (Section 1.8)
│   │   ├── mocks/                    # MSW handlers using mock_api.json
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── docs/
│   ├── SYSTEM_DESIGN_v2_Revenue_Process_Twin.docx
│   └── Revenue-Process-Twin_Build-Handoff.md   # this file
│
└── README.md
```

**Where the datasets live:** raw downloads → `backend/data/raw/` (gitignored) → cleaned/renamed → `backend/data/staging/` → built into → `backend/data/final/revenue_leaks.db`, which is the only thing the FastAPI layer ever reads from.

---

## 5. Quick Reference — Who Owns What

| Area | Owner | Key files |
|---|---|---|
| Dataset ingestion & cleaning | You | `backend/data/`, `build_db.py`, `PROVENANCE.md` |
| Rules + ML + Conformance + Graph + Counterfactual | You | `backend/app/services/*` |
| FastAPI routes | You | `backend/app/api/*` |
| Tiny LLM Narrator | You | `backend/app/services/narrator.py` |
| React dashboard + Customer 360 + Chat UI | Teammate | `frontend/src/*` |
| Mock Billing Portal (static HTML action target) | Teammate | `frontend/mock-billing/` |
| MSW mocks for demo resilience | Teammate | `frontend/src/mocks/` |
| API contract / shared TS interfaces | Both (frozen Day 0) | Section 1 of this doc |
