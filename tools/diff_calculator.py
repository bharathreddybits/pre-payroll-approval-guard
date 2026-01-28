#!/usr/bin/env python3
"""
Diff Calculator for Pre-Payroll Approval Guard
Calculates deterministic differences between baseline and current payroll datasets
"""

import sys
import json
import os
from typing import Dict, List
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print(json.dumps({
        'success': False,
        'error': 'Missing Supabase environment variables'
    }))
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_employee_records(dataset_id: str) -> Dict[str, Dict]:
    """
    Fetch all employee pay records for a dataset

    Returns:
        Dictionary keyed by employee_id
    """
    response = supabase.table('employee_pay_record') \
        .select('*') \
        .eq('dataset_id', dataset_id) \
        .execute()

    records = {}
    for record in response.data:
        records[record['employee_id']] = record

    return records


def get_pay_components(record_id: str) -> Dict[str, float]:
    """
    Fetch pay components for an employee pay record

    Returns:
        Dictionary of component_name -> amount
    """
    response = supabase.table('pay_component') \
        .select('component_name, amount') \
        .eq('record_id', record_id) \
        .execute()

    components = {}
    for component in response.data:
        components[component['component_name']] = float(component['amount'])

    return components


def calculate_percentage_change(old_value: float, new_value: float) -> float:
    """
    Calculate percentage change
    """
    if old_value == 0:
        return 0.0 if new_value == 0 else 100.0

    return ((new_value - old_value) / abs(old_value)) * 100


def calculate_diff(review_session_id: str) -> Dict:
    """
    Calculate differences between baseline and current datasets

    Args:
        review_session_id: UUID of the review session

    Returns:
        Dictionary with success status, delta count, and any errors
    """
    try:
        # Fetch datasets for this review session
        datasets_response = supabase.table('payroll_dataset') \
            .select('dataset_id, dataset_type, organization_id') \
            .eq('review_session_id', review_session_id) \
            .execute()

        if not datasets_response.data or len(datasets_response.data) < 2:
            return {
                'success': False,
                'error': 'Could not find both baseline and current datasets for this review session'
            }

        # Extract baseline and current dataset IDs
        baseline_dataset = next((d for d in datasets_response.data if d['dataset_type'] == 'baseline'), None)
        current_dataset = next((d for d in datasets_response.data if d['dataset_type'] == 'current'), None)

        if not baseline_dataset or not current_dataset:
            return {
                'success': False,
                'error': 'Missing baseline or current dataset'
            }

        baseline_id = baseline_dataset['dataset_id']
        current_id = current_dataset['dataset_id']
        organization_id = baseline_dataset['organization_id']

        # Fetch employee records from both datasets
        baseline_emps = get_employee_records(baseline_id)
        current_emps = get_employee_records(current_id)

        deltas = []

        # Detect removed employees
        for emp_id in baseline_emps:
            if emp_id not in current_emps:
                baseline_emp = baseline_emps[emp_id]
                deltas.append({
                    'review_session_id': review_session_id,
                    'organization_id': organization_id,
                    'employee_id': emp_id,
                    'metric': 'net_pay',
                    'baseline_value': float(baseline_emp['net_pay']) if baseline_emp['net_pay'] else 0.0,
                    'current_value': 0.0,
                    'delta_absolute': -float(baseline_emp['net_pay']) if baseline_emp['net_pay'] else 0.0,
                    'delta_percentage': -100.0,
                    'change_type': 'removed_employee'
                })

        # Detect new and changed employees
        for emp_id, curr_emp in current_emps.items():
            if emp_id not in baseline_emps:
                # New employee
                deltas.append({
                    'review_session_id': review_session_id,
                    'organization_id': organization_id,
                    'employee_id': emp_id,
                    'metric': 'net_pay',
                    'baseline_value': None,
                    'current_value': float(curr_emp['net_pay']) if curr_emp['net_pay'] else 0.0,
                    'delta_absolute': float(curr_emp['net_pay']) if curr_emp['net_pay'] else 0.0,
                    'delta_percentage': None,
                    'change_type': 'new_employee'
                })
            else:
                # Existing employee - compare values
                baseline_emp = baseline_emps[emp_id]

                # Compare net_pay
                curr_net = float(curr_emp['net_pay']) if curr_emp['net_pay'] else 0.0
                base_net = float(baseline_emp['net_pay']) if baseline_emp['net_pay'] else 0.0

                if curr_net != base_net:
                    delta_abs = curr_net - base_net
                    delta_pct = calculate_percentage_change(base_net, curr_net)

                    deltas.append({
                        'review_session_id': review_session_id,
                        'organization_id': organization_id,
                        'employee_id': emp_id,
                        'metric': 'net_pay',
                        'baseline_value': base_net,
                        'current_value': curr_net,
                        'delta_absolute': delta_abs,
                        'delta_percentage': delta_pct,
                        'change_type': 'increase' if delta_abs > 0 else 'decrease'
                    })

                # Compare gross_pay
                curr_gross = float(curr_emp['gross_pay']) if curr_emp['gross_pay'] else 0.0
                base_gross = float(baseline_emp['gross_pay']) if baseline_emp['gross_pay'] else 0.0

                if curr_gross != base_gross:
                    delta_abs = curr_gross - base_gross
                    delta_pct = calculate_percentage_change(base_gross, curr_gross)

                    deltas.append({
                        'review_session_id': review_session_id,
                        'organization_id': organization_id,
                        'employee_id': emp_id,
                        'metric': 'gross_pay',
                        'baseline_value': base_gross,
                        'current_value': curr_gross,
                        'delta_absolute': delta_abs,
                        'delta_percentage': delta_pct,
                        'change_type': 'increase' if delta_abs > 0 else 'decrease'
                    })

                # Compare total_deductions
                curr_ded = float(curr_emp['total_deductions']) if curr_emp['total_deductions'] else 0.0
                base_ded = float(baseline_emp['total_deductions']) if baseline_emp['total_deductions'] else 0.0

                if curr_ded != base_ded:
                    delta_abs = curr_ded - base_ded
                    delta_pct = calculate_percentage_change(base_ded, curr_ded)

                    deltas.append({
                        'review_session_id': review_session_id,
                        'organization_id': organization_id,
                        'employee_id': emp_id,
                        'metric': 'total_deductions',
                        'baseline_value': base_ded,
                        'current_value': curr_ded,
                        'delta_absolute': delta_abs,
                        'delta_percentage': delta_pct,
                        'change_type': 'increase' if delta_abs > 0 else 'decrease'
                    })

                # Compare pay_components (if available)
                try:
                    baseline_components = get_pay_components(baseline_emp['record_id'])
                    current_components = get_pay_components(curr_emp['record_id'])

                    # Find all unique component names
                    all_component_names = set(baseline_components.keys()) | set(current_components.keys())

                    for component_name in all_component_names:
                        baseline_amt = baseline_components.get(component_name, 0.0)
                        current_amt = current_components.get(component_name, 0.0)

                        if baseline_amt != current_amt:
                            delta_abs = current_amt - baseline_amt
                            delta_pct = calculate_percentage_change(baseline_amt, current_amt)

                            deltas.append({
                                'review_session_id': review_session_id,
                                'organization_id': organization_id,
                                'employee_id': emp_id,
                                'metric': 'component',
                                'component_name': component_name,
                                'baseline_value': baseline_amt,
                                'current_value': current_amt,
                                'delta_absolute': delta_abs,
                                'delta_percentage': delta_pct,
                                'change_type': 'increase' if delta_abs > 0 else 'decrease'
                            })
                except Exception as e:
                    # Component comparison is optional, continue if it fails
                    print(f"Warning: Could not compare components for employee {emp_id}: {str(e)}", file=sys.stderr)

        # Bulk insert deltas into database
        if deltas:
            # Insert in batches of 100 to avoid hitting Supabase limits
            batch_size = 100
            for i in range(0, len(deltas), batch_size):
                batch = deltas[i:i + batch_size]
                supabase.table('payroll_delta').insert(batch).execute()

        return {
            'success': True,
            'delta_count': len(deltas),
            'baseline_employee_count': len(baseline_emps),
            'current_employee_count': len(current_emps),
            'new_employees': len([d for d in deltas if d['change_type'] == 'new_employee']),
            'removed_employees': len([d for d in deltas if d['change_type'] == 'removed_employee'])
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """
    CLI interface for diff calculation
    Usage: python diff_calculator.py <review_session_id>
    """
    if len(sys.argv) != 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python diff_calculator.py <review_session_id>'
        }))
        sys.exit(1)

    review_session_id = sys.argv[1]
    result = calculate_diff(review_session_id)

    # Output JSON result
    print(json.dumps(result, indent=2))

    # Exit with appropriate code
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
