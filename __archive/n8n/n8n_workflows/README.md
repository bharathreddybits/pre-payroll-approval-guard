# n8n Workflows

This directory contains n8n workflow definitions for the Pre-Payroll Approval Guard.

## Files

- **`1_diff_calculator.json`** - Compares baseline vs current payroll datasets and calculates deltas
- **`2_judgement_engine.json`** - Applies 12 deterministic rules to classify changes as material/blocker

## Import Instructions

See [docs/N8N_WORKFLOWS.md](../docs/N8N_WORKFLOWS.md) for complete setup and configuration instructions.

## Quick Import

1. Open your n8n instance
2. Click "+ Add Workflow"
3. Click "..." → "Import from file"
4. Select workflow JSON file
5. Configure Supabase credentials
6. Activate workflow
7. Copy webhook URL for Vercel environment variables

## Workflow Triggers

Both workflows are triggered via webhooks:

- **Diff Calculator**: `https://your-n8n.com/webhook/ppg-diff-calculator`
- **Judgement Engine**: `https://your-n8n.com/webhook/ppg-judgement-engine`

Add these URLs as environment variables in Vercel:
- `N8N_DIFF_WEBHOOK_URL`
- `N8N_JUDGEMENT_WEBHOOK_URL`

## Automated Flow

```
CSV Upload (Vercel)
  ↓
Store Data (Supabase)
  ↓
Trigger Diff Calculator (n8n webhook)
  ↓
Calculate Deltas (n8n workflow)
  ↓
Store Deltas (Supabase)
  ↓
Trigger Judgement Engine (n8n webhook)
  ↓
Apply 12 Rules (n8n workflow)
  ↓
Store Judgements (Supabase)
  ↓
User Reviews Results (Vercel UI)
```

## Testing

Test workflows manually:

```bash
# Test diff calculator
curl -X POST https://your-n8n.com/webhook/ppg-diff-calculator \
  -H "Content-Type: application/json" \
  -d '{"review_session_id": "YOUR_SESSION_ID"}'

# Test judgement engine
curl -X POST https://your-n8n.com/webhook/ppg-judgement-engine \
  -H "Content-Type: application/json" \
  -d '{"review_session_id": "YOUR_SESSION_ID"}'
```

## Documentation

Full documentation: [docs/N8N_WORKFLOWS.md](../docs/N8N_WORKFLOWS.md)
