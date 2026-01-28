# Workflows Directory

This directory contains Standard Operating Procedures (SOPs) in markdown format that define how the Pre-Payroll Approval Guard system operates.

## What Are Workflows?

Workflows are Layer 1 of the WAT framework. Each workflow document describes:

1. **Objective**: What the workflow accomplishes
2. **Inputs**: Required data and parameters
3. **Tools**: Which scripts, APIs, or services to use
4. **Process**: Step-by-step execution
5. **Outputs**: Expected results
6. **Edge Cases**: How to handle failures and exceptions

## Current Workflows

- `payroll_snapshot_upload.md` - Handle CSV file uploads and validation
- `payroll_comparison.md` - Compare two snapshots and generate diffs
- `material_judgement.md` - AI evaluation of changes for materiality
- `payroll_review_ui.md` - One-screen approval interface specifications

## Writing Workflows

Workflows should be:
- **Clear**: Written in plain language for solo developers
- **Specific**: Tailored to payroll domain and our tech stack
- **Complete**: Cover normal flow and edge cases
- **Actionable**: Claude should be able to execute by reading the workflow

## Updating Workflows

Workflows evolve based on:
- New features discovered during implementation
- Failures and lessons learned
- Performance optimizations
- User feedback

Always update workflows when you learn better approaches.
