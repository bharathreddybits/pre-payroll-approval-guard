# PayrollShield — Full Tech Stack

---

## Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 14 (Pages Router) | Framework — SSR, routing, API routes |
| **React** | 18 | UI rendering |
| **TypeScript** | 5 | Type safety across the entire codebase |
| **Tailwind CSS** | 3 | Utility-first styling |
| **Radix UI** | (accordion, dialog, alert-dialog, slot) | Accessible headless UI primitives |
| **shadcn/ui** | custom | Component library built on top of Radix |
| **lucide-react** | 0.563 | Icon set |
| **class-variance-authority** | 0.7 | Variant-based component styling |
| **clsx + tailwind-merge** | — | Conditional class name merging |
| **tailwindcss-animate** | 1.0 | Animation utilities |

---

## File Handling & Forms
| Technology | Version | Purpose |
|-----------|---------|---------|
| **react-dropzone** | 14 | Drag-and-drop CSV upload UI |
| **formidable** | 3 | Multipart form parsing in API routes |
| **papaparse** | 5 | CSV parsing (baseline vs current payroll files) |

---

## Notifications
| Technology | Version | Purpose |
|-----------|---------|---------|
| **sonner** | 2 | Toast notifications (upload progress, approval success/error) |

---

## Backend — API Layer
| Technology | Purpose |
|-----------|---------|
| **Next.js API Routes** | Serverless functions: `/api/upload`, `/api/approve`, `/api/review/[id]`, `/api/template` |
| **openai SDK** | 6.17 — OpenAI API calls for generating human-readable explanations on the review page |

---

## Database & Auth
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Supabase** | (hosted) | PostgreSQL database, Auth, file Storage |
| **@supabase/supabase-js** | 2.39 | Client SDK — DB queries, auth, RLS |
| **Row Level Security (RLS)** | — | Multi-tenant data isolation at DB level |
| **Supabase Auth** | — | User authentication (email/password) |
| **postgres.js** | 3.4 | PostgreSQL client (direct DB access in specific server contexts) |

**Database tables (known from migrations):**
- `organization` — tenant accounts
- `user_organization_mapping` — user ↔ org relationships
- `review_session` — each payroll upload run
- `payroll_snapshot` — baseline and current CSV data
- `judgement` — flagged changes with rules applied
- `approval` — approve/reject decisions with audit trail
- `subscription` — LemonSqueezy subscription status per org
- Helper functions: `is_trial_expired()`, `trial_days_remaining()`

---

## Processing Pipeline (native TypeScript)
| File | Purpose |
|------|---------|
| **lib/payroll/processor.ts** | Orchestrator — calls the steps below in sequence |
| **lib/payroll/diff.ts** | Calculates field-by-field deltas between baseline and current employee records |
| **lib/payroll/rulesEngine.ts** | Applies all judgement rules to the calculated deltas (deterministic, no AI) |
| **lib/payroll/persistence.ts** | Saves deltas and judgements to Supabase, updates session status |
| **lib/rules/** | 40+ individual rule definitions, one category per file |

All processing runs inline in the Next.js API route on Vercel — no external services needed.

---

## Billing
| Technology | Version | Purpose |
|-----------|---------|---------|
| **LemonSqueezy** | — | Subscription management (Starter / Pro plans) |
| **@lemonsqueezy/lemonsqueezy.js** | 4.0 | SDK for webhook handling and subscription queries |

---

## AI
| Technology | Purpose |
|-----------|---------|
| **OpenAI GPT-4o-mini** | Generates human-readable explanations for flagged payroll changes, called directly from the review API route. Rules are deterministic — AI only explains, never decides. |

---

## Hosting & Deployment
| Technology | Purpose |
|-----------|---------|
| **Vercel** | Hosts the Next.js app and all API routes; auto-deploys on git push to `master` |
| **GitHub** | Version control and CI trigger |

---

## Dev Tooling
| Technology | Version | Purpose |
|-----------|---------|---------|
| **ESLint** | 8 + eslint-config-next | Linting |
| **PostCSS + autoprefixer** | — | CSS processing for Tailwind |
| **Supabase CLI** | 2.98 | Local dev, migration management |
| **pg (node-postgres)** | 8.20 | Dev-only — used in `scripts/dev/` migration tools |
| **TypeScript compiler** | 5.3 | Build-time type checking |

---

## Architecture Principle

Probabilistic AI (reasoning) is kept separate from deterministic execution (payroll diffs, DB writes). Rules always produce the same output for the same input — AI only generates the human-readable explanation shown to the reviewer.

---

## Request Flow (End-to-End)

```
User uploads 2 CSVs
  → /api/upload
      → formidable parses files
      → employee records saved to Supabase
      → lib/payroll/processor.ts runs inline:
          → diff.ts calculates field-by-field deltas
          → rulesEngine.ts applies all judgement rules (deterministic)
          → persistence.ts saves deltas + judgements to DB
      → redirect to /review/[id]
  → /api/review/[id]
      → loads deltas + judgements from DB
      → enriches with rule metadata (name, severity, explanation)
      → OpenAI generates human-readable summaries (if API key set)
      → review page renders verdict + flagged items
  → User approves/rejects
      → /api/approve writes audit record to Supabase
```
