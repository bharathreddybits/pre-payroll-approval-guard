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
| **form-data** | 4 | Constructing multipart requests to n8n |

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
| **node-fetch** | HTTP calls from API routes to n8n webhook |
| **openai SDK** | 6.17 — OpenAI API calls (used in n8n or directly for AI explanations) |

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

## Automation Engine
| Technology | Purpose |
|-----------|---------|
| **n8n** (self-hosted) | Core processing pipeline: receives CSV data via webhook → calculates diffs → applies 73 judgement rules → emits results back to Supabase |
| **Hostinger VPS** | Hosts the n8n instance |

The n8n workflow handles all the heavy lifting — diff calculation, rule evaluation, AI explanation generation — keeping the Next.js API routes thin.

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
| **OpenAI GPT-4o-mini** | Generates human-readable explanations for flagged payroll changes, called via n8n workflows |

---

## Hosting & Deployment
| Technology | Purpose |
|-----------|---------|
| **Vercel** | Hosts the Next.js app; auto-deploys on git push to `master` |
| **GitHub** | Version control and CI trigger |
| **Hostinger VPS** | Self-hosts n8n (keeps automation cost low vs cloud n8n) |

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

## Architecture Pattern — WAT Framework

```
Workflows (Markdown SOPs in workflows/)
    ↓
Agent (Claude Code — orchestration & reasoning)
    ↓
Tools (n8n nodes, Supabase, scripts)
```

The deliberate separation keeps probabilistic AI (reasoning) away from deterministic execution (payroll diffs, DB writes), which is important for a financial accuracy use case.

---

## Request Flow (End-to-End)

```
User uploads 2 CSVs
  → Next.js /api/upload (formidable parses, Supabase stores)
  → n8n webhook triggered
    → diff calculated deterministically
    → 73 judgement rules applied
    → GPT-4o-mini generates explanations
    → results written to Supabase
  → Next.js polls /api/review/[id]
  → Review page renders verdict + flagged items
  → User approves/rejects → /api/approve → Supabase audit record
```
