# Pre-Payroll Approval Guard

A SaaS application built on the WAT framework (Workflows, Agents, Tools) to detect and flag material payroll changes before processing.

## Overview

The Pre-Payroll Approval Guard helps organizations prevent payroll errors by comparing current payroll snapshots against previous ones, identifying material changes, and requiring explicit approval before processing.

### Key Features
- **Automated Change Detection**: Compare payroll snapshots and identify differences
- **Material Change Judgement**: AI-powered evaluation of changes to determine if they're material
- **Blocker Detection**: Identify critical issues (e.g., negative net pay) that must be resolved
- **One-Screen Review UI**: Streamlined approval interface for payroll reviewers
- **Audit Trail**: Complete history of approvals and changes

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript, deployed on Vercel
- **Backend**: Supabase (PostgreSQL database, authentication, storage)
- **Processing**: Native TypeScript pipeline in `lib/payroll/` — no external services
- **AI**: OpenAI GPT-4o-mini for human-readable explanations (rules are deterministic)
- **Billing**: LemonSqueezy for subscription management
- **Version Control**: GitHub with auto-deployment to Vercel

## Architecture: WAT Framework

### Workflows (Layer 1)
Markdown SOPs in `workflows/` directory that define:
- Objective and inputs
- Required tools
- Expected outputs
- Edge case handling

### Agents (Layer 2)
Claude orchestrates workflows by:
- Reading workflow instructions
- Running tools in correct sequence
- Handling failures gracefully
- Making intelligent decisions

### Tools (Layer 3)
Deterministic execution in the codebase:
- TypeScript processing pipeline in `lib/payroll/`
- 40+ deterministic judgement rules in `lib/rules/`
- API integrations (Supabase, OpenAI, LemonSqueezy)
- CSV parsing via papaparse + formidable

## Directory Structure

```
.
├── pages/                 # Next.js pages and API routes
├── components/            # React components
├── lib/
│   ├── payroll/           # Processing pipeline (diff, rules engine, persistence, processor)
│   ├── rules/             # 40+ deterministic judgement rules, one category per file
│   ├── billing/           # Subscription tier logic
│   └── types/             # Shared TypeScript types
├── supabase/
│   └── migrations/        # SQL migration files
├── scripts/               # Setup and operational scripts
├── workflows/             # Markdown workflow SOPs
├── docs/                  # Project documentation
├── __archive/             # Archived dev artifacts
├── .env                   # Environment variables (not committed)
├── CLAUDE.md              # Agent instructions
└── README.md              # This file
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key (for AI explanations on the review page)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd PPG
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Run development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Database Setup

1. Create a Supabase project
2. Run migrations in `supabase/migrations/`
3. Configure Row Level Security (RLS) policies
4. Update `.env` with Supabase credentials

### Processing Architecture

**Automated Processing Pipeline:**
- CSV upload triggers automatic delta calculation and judgement application
- All processing happens within the Next.js API using TypeScript
- No external dependencies required for core functionality
- Processing completes in ~5-7 seconds for typical payroll datasets

**Technical Details:**
- Processing entry point: `lib/payroll/processor.ts`
- Delta calculation: `lib/payroll/diff.ts`
- 40+ deterministic rules in `lib/rules/` — one category per file
- Results stored in Supabase for audit trail

## Development Guidelines

### Core Principles
- **Correctness over speed**: Payroll accuracy is critical
- **Clarity over cleverness**: Code must be maintainable
- **Safety over flexibility**: Prevent errors before they happen

### Code Standards
- Write production-ready code (no examples or toy patterns)
- Handle sensitive data appropriately (anonymize in dev)
- Test thoroughly before deploying
- Document workflow changes

### Cost Optimization
- Target: <$60/mo total operational costs
- Use free tiers where possible
- Monitor API usage (OpenAI, Supabase, LemonSqueezy)

## Deployment

### Vercel (Frontend)
- Push to GitHub main branch
- Automatic deployment via Vercel integration
- Configure environment variables in Vercel dashboard

### Supabase (Database)
- Migrations are applied automatically
- Enable RLS policies for security
- Configure backup schedule

## MVP Features

1. **CSV Upload**: Upload current and previous payroll snapshots
2. **Diff Calculation**: Compute differences between snapshots
3. **Material Change Detection**: AI evaluation of changes
4. **Blocker Identification**: Flag critical issues
5. **One-Screen Review**: Unified approval interface
6. **Audit Trail**: Track all approvals and changes

## Cost Structure

- Supabase: Free tier (up to 500MB database, 2GB bandwidth)
- Vercel: Free tier (hobby plan)
- OpenAI: Pay-as-you-go (target <$15/mo at ~$0.01-0.03 per review)
- LemonSqueezy: No monthly fee (revenue share only)

**Total Target**: <$60/mo

## Target Market

B2B SaaS for organizations processing payroll:
- Small to medium businesses (10-500 employees)
- Payroll service providers
- Finance teams requiring approval workflows
- Companies with compliance requirements

**Target WTP**: $500+/month per organization

## Contributing

This is a production codebase. All contributions should:
- Follow existing patterns
- Include appropriate tests
- Update relevant workflows
- Maintain backward compatibility

## License

Proprietary - All rights reserved

## Support

For issues and questions, refer to:
- Workflow documentation in `workflows/`
- Agent instructions in `CLAUDE.md`
- Inline code documentation
