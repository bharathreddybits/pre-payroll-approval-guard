#!/usr/bin/env python3
"""
CSV Validation Script for Pre-Payroll Approval Guard
Validates uploaded payroll CSVs before processing
"""

import sys
import json
import pandas as pd
from typing import Dict, List, Tuple

# Required columns for payroll CSV
REQUIRED_COLUMNS = [
    'employee_id',
    'gross_pay',
    'deductions',
    'net_pay',
]

# Optional but recommended columns
OPTIONAL_COLUMNS = [
    'employee_name',
    'department',
    'hours_worked',
    'rate',
    'employment_status'
]


def validate_csv(file_path: str) -> Tuple[bool, Dict]:
    """
    Validate a payroll CSV file

    Args:
        file_path: Path to the CSV file to validate

    Returns:
        Tuple of (is_valid, result_dict)
        result_dict contains:
            - valid: bool
            - errors: List of error messages
            - warnings: List of warning messages
            - row_count: Number of data rows
            - columns: List of column names found
    """
    errors = []
    warnings = []

    try:
        # Read CSV
        df = pd.read_csv(file_path)

        # Check if file is empty
        if df.empty:
            errors.append("CSV file is empty")
            return False, {
                'valid': False,
                'errors': errors,
                'warnings': warnings,
                'row_count': 0,
                'columns': []
            }

        # Normalize column names (lowercase, strip whitespace)
        df.columns = df.columns.str.lower().str.strip()

        # Check for required columns
        missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_columns:
            errors.append(f"Missing required columns: {', '.join(missing_columns)}")

        # Check for optional columns
        missing_optional = [col for col in OPTIONAL_COLUMNS if col not in df.columns]
        if missing_optional:
            warnings.append(f"Missing optional columns: {', '.join(missing_optional)}")

        # If required columns are missing, return early
        if missing_columns:
            return False, {
                'valid': False,
                'errors': errors,
                'warnings': warnings,
                'row_count': len(df),
                'columns': df.columns.tolist()
            }

        # Validate data types and values
        for idx, row in df.iterrows():
            row_num = idx + 2  # +2 because CSV is 1-indexed and header is row 1

            # Check employee_id is not empty
            if pd.isna(row['employee_id']) or str(row['employee_id']).strip() == '':
                errors.append(f"Row {row_num}: employee_id is empty")

            # Validate numeric fields
            for field in ['gross_pay', 'deductions', 'net_pay']:
                try:
                    value = float(row[field])

                    # Store as float for calculation
                    df.at[idx, field] = value

                except (ValueError, TypeError):
                    errors.append(f"Row {row_num}: {field} is not a valid number ({row[field]})")

            # Validate hours_worked and rate if present
            if 'hours_worked' in df.columns and not pd.isna(row['hours_worked']):
                try:
                    hours = float(row['hours_worked'])
                    if hours < 0:
                        warnings.append(f"Row {row_num}: hours_worked is negative ({hours})")
                except (ValueError, TypeError):
                    warnings.append(f"Row {row_num}: hours_worked is not a valid number ({row['hours_worked']})")

            if 'rate' in df.columns and not pd.isna(row['rate']):
                try:
                    rate = float(row['rate'])
                    if rate < 0:
                        warnings.append(f"Row {row_num}: rate is negative ({rate})")
                except (ValueError, TypeError):
                    warnings.append(f"Row {row_num}: rate is not a valid number ({row['rate']})")

        # If there were numeric parsing errors, return early
        if errors:
            return False, {
                'valid': False,
                'errors': errors,
                'warnings': warnings,
                'row_count': len(df),
                'columns': df.columns.tolist()
            }

        # Validate payroll calculations (net_pay ≈ gross_pay - deductions)
        TOLERANCE = 0.01
        for idx, row in df.iterrows():
            row_num = idx + 2

            gross_pay = float(row['gross_pay'])
            deductions = float(row['deductions'])
            net_pay = float(row['net_pay'])

            expected_net_pay = gross_pay - deductions
            difference = abs(net_pay - expected_net_pay)

            if difference > TOLERANCE:
                errors.append(
                    f"Row {row_num}: Net pay calculation mismatch. "
                    f"Expected {expected_net_pay:.2f} (gross {gross_pay:.2f} - deductions {deductions:.2f}), "
                    f"got {net_pay:.2f}. Difference: ${difference:.2f}"
                )

            # Check for negative net pay (BLOCKER)
            if net_pay < 0:
                errors.append(
                    f"Row {row_num}: BLOCKER - Net pay is negative (${net_pay:.2f}) for employee {row['employee_id']}"
                )

            # Check for negative gross pay (unusual)
            if gross_pay < 0:
                warnings.append(
                    f"Row {row_num}: Gross pay is negative (${gross_pay:.2f}) for employee {row['employee_id']}"
                )

        # Final validation result
        is_valid = len(errors) == 0

        return is_valid, {
            'valid': is_valid,
            'errors': errors,
            'warnings': warnings,
            'row_count': len(df),
            'columns': df.columns.tolist()
        }

    except FileNotFoundError:
        return False, {
            'valid': False,
            'errors': [f"File not found: {file_path}"],
            'warnings': [],
            'row_count': 0,
            'columns': []
        }
    except pd.errors.EmptyDataError:
        return False, {
            'valid': False,
            'errors': ["CSV file is empty or has no data"],
            'warnings': [],
            'row_count': 0,
            'columns': []
        }
    except Exception as e:
        return False, {
            'valid': False,
            'errors': [f"Unexpected error: {str(e)}"],
            'warnings': [],
            'row_count': 0,
            'columns': []
        }


def main():
    """
    CLI interface for CSV validation
    Usage: python validate_csv.py <file_path>
    """
    if len(sys.argv) != 2:
        print(json.dumps({
            'valid': False,
            'errors': ['Usage: python validate_csv.py <file_path>'],
            'warnings': [],
            'row_count': 0,
            'columns': []
        }))
        sys.exit(1)

    file_path = sys.argv[1]
    is_valid, result = validate_csv(file_path)

    # Output JSON result
    print(json.dumps(result, indent=2))

    # Exit with appropriate code
    sys.exit(0 if is_valid else 1)


if __name__ == '__main__':
    main()
