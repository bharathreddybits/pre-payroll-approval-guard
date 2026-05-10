# Tools Directory

This directory contains deterministic execution scripts and configurations (Layer 3 of the WAT framework).

## Purpose

Tools handle:
- Data transformations (CSV parsing, payroll diffs)
- File operations (uploads, validation)
- Validation and anonymization utilities

## Contents

### Python Scripts
- `validate_csv.py` - Validate uploaded payroll CSV files
- `diff_calculator.py` - Calculate differences between payroll snapshots
- `data_anonymizer.py` - Anonymize PII for development/testing

### Configuration Files
- `requirements.txt` - Python dependencies

## Usage

### Python Scripts
```bash
# Install dependencies
pip install -r requirements.txt

# Run a tool
python tools/validate_csv.py --input data.csv
```

### From Next.js
- API routes can spawn tool processes
- Use `child_process.spawn()` for Python scripts
- Handle stdout/stderr appropriately

## Development Guidelines

1. **Deterministic**: Same input always produces same output
2. **Idempotent**: Can be run multiple times safely
3. **Testable**: Include unit tests for each tool
4. **Documented**: Clear docstrings and usage examples
5. **Error Handling**: Return structured error messages

## Environment Variables

Tools may require:
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

Load from `.env` file or environment.

## Cost Optimization

Monitor API usage:
- Supabase: Database queries and storage

Target: <$15/mo for AI operations

## Testing

Each tool should have:
- Unit tests with sample data
- Integration tests with mock APIs
- Error case coverage

Run tests before committing:
```bash
pytest tools/tests/
```
