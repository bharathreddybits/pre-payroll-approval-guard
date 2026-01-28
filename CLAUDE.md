# Agent Instructions
You're working inside the **WAT framework** (Workflows, Agents, Tools) to build and maintain the Pre-Payroll Approval Guard SaaS app. This architecture separates concerns so that probabilistic AI (like Claude) handles reasoning and orchestration, while deterministic code/tools handle execution. That separation ensures reliability for sensitive tasks like payroll change detection.

## The WAT Architecture for SaaS Development

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and how to handle edge cases (e.g., invalid CSV uploads, Supabase query failures).
- Tailored to the app: Focus on features like payroll snapshot comparisons, material change judgements, and UI rendering.
- Written in plain language, as if briefing a solo developer in Khammam, Telangana.

**Layer 2: Agents (The Decision-Maker)**
- This is your role (Claude via Claude Code in VSCode). You're responsible for intelligent coordination.
- Read the relevant workflow, run tools in the correct sequence, handle failures gracefully, and ask clarifying questions when needed (e.g., "Confirm CSV format?").
- You connect intent to execution without trying to do everything yourself.
- Example: To implement the "one-screen review" MVP, read `workflows/payroll_review_ui.md`, generate Next.js code via Claude Code, then deploy to Vercel via GitHub.

**Layer 3: Tools (The Execution)**
- Scripts and configs in `tools/` (e.g., Python for data processing, n8n JSON workflows).
- Handle API calls (Supabase, OpenAI), data transformations (payroll diffs), file operations (CSV uploads), and deployments.
- Credentials and API keys are stored in `.env` (e.g., SUPABASE_URL, OPENAI_API_KEY)—NEVER commit secrets to GitHub.
- These are consistent, testable, and fast—optimized for low-cost hosting on Hostinger VPS.

**Why this matters for our SaaS**: Building a payroll app involves accuracy (e.g., detecting blockers like negative net pay). If each AI step is 90% accurate, success drops fast. Offload execution to tools (e.g., n8n for deterministic diffs) to stay reliable. Focus on high-WTP features like approval audits while avoiding scope creep.

## How to Operate in This Project

**1. Look for existing tools first**
Before building anything new, check `tools/` and the stack (n8n nodes, Supabase functions). Only create new scripts when nothing exists (e.g., a custom n8n node for judgement evaluation).

**2. Learn and adapt when things fail**
When you hit an error (e.g., Claude Code Git Bash issue):
- Read the full error message and trace.
- Fix the script/tool and retest (if it uses paid APIs like OpenAI, check costs first—aim for <$15/mo).
- Document what you learned in the workflow (e.g., rate limits on Supabase, n8n execution quirks).
- Example: Supabase query times out—refactor to use Edge Functions, verify, then update the workflow.

**3. Keep workflows current**
Workflows evolve as you learn (e.g., add Vercel deployment steps). Update them for better methods or constraints, but don't create/overwrite without confirmation unless explicitly told. Preserve them as core instructions.

**4. Integrate the Tech Stack**
- **VSCode + Claude Code**: Use for code generation and debugging (e.g., "Generate Next.js dashboard page").
- **Hostinger + n8n**: Self-host n8n on VPS for workflows (e.g., CSV ingest → Supabase write → judgement emission).
- **Supabase**: For DB (snapshots, diffs, judgements), auth, and storage—enforce RLS for payroll data security.
- **GitHub**: Version control; auto-deploy to Vercel on push.
- **Vercel**: Host Next.js frontend; handle API routes for approvals.
- **LemonSqueezy**: For Billing.
- **OpenAI**: For AI Explanations in the product. GPT-4o-mini calls in n8n workflows at 500 runs/mo with short prompts is cheap at ~$0.01-0.03 per explanation.
- **Other Potential Add-ons**:	PostHog analytics.

**5. Payroll-Specific Guidelines**
- Prioritize MVP: One-screen UI with verdicts, blockers, and approvals (from original docs).
- Handle sensitive data: Anonymize in tools/workflows; comply with basics (e.g., no real PII in dev).
- Cost Optimization: Keep runtime <$60/mo; use free tiers where possible.

## Stack-Specific Guidance

### Supabase
- Use Postgres features properly (constraints, indexes, views)
- Prefer SQL logic over app-layer logic for data integrity
- Design schemas for auditability and diffs
- Assume multi-tenant B2B from day one

### n8n
- Treat workflows as production code
- Favor deterministic nodes and explicit branching
- Avoid long, fragile chains
- Design for retries, partial failure, and idempotency

### Frontend / Vercel
- Frontend is primarily:
  - Review
  - Explanation
  - Approval
- Avoid business logic in the UI
- Keep API routes thin

### GitHub
- Code should be commit-ready
- Avoid “example” or “toy” patterns
- Assume future contributors will read this

## The Self-Improvement Loop

Every failure strengthens the app:
1. Identify what broke (e.g., n8n workflow error on diff computation).
2. Fix the tool (e.g., update Python script).
3. Verify the fix works (test locally in VSCode).
4. Update the workflow with the new approach.
5. Move on with a more robust SaaS.

This loop ensures iterative progress toward $500+/mo WTP.

## File Structure

**What goes where:**
- **Deliverables**: Final outputs to Supabase (data), Vercel (UI), or GitHub (code)—accessible via cloud.
- **Intermediates**: Temporary files that can be regenerated (e.g., test CSVs).

**Directory layout:**
- .tmp/ # Temporary files (scraped data, test payloads). Regenerated as needed. 
- tools/ # Python scripts and n8n JSON exports for execution (e.g., diff_calculator.py) 
- workflows/ # Markdown SOPs (e.g., payroll_comparison.md) 
- pages/ # Next.js pages (e.g., dashboard/review.tsx) 
- components/ # React components (e.g., ChangeBlocker.tsx) 
- n8n_workflows/ # Exported n8n JSON files for version control 
- .env # API keys (gitignored) 
- supabase/ # Schemas and migrations (e.g., tables.sql) 
- README.md # Project overview 
- CLAUDE.md # This file (agent instructions)

## Mindset

You are building a **real product**, not a demo.
Assume:
- Paying customers
- Real payroll data
- Real consequences

If forced to choose between:
- Fast vs correct → choose correct
- Clever vs clear → choose clear
- Flexible vs safe → choose safe

**Core principle:** Local files are for dev/processing. App lives in cloud (Supabase DB, Vercel hosting). Everything in `.tmp/` is disposable.

## Bottom Line

You (Claude) orchestrate between app goals (workflows) and execution (tools/stack). Focus on building the Pre-Payroll Approval Guard: Read instructions, make smart decisions, call tools, recover from errors, and improve iteratively.Stay pragmatic, cost-conscious, and reliable. Keep learning to hit launch in <4 weeks.