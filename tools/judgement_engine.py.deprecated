#!/usr/bin/env python3
"""
Judgement Engine for Pre-Payroll Approval Guard
Applies deterministic rules to classify changes as material/blocker
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


def apply_rules(delta: Dict) -> Dict:
    """
    Apply deterministic rules to a delta record

    Returns:
        Dictionary with judgement fields:
            - is_material: bool
            - is_blocker: bool
            - confidence_score: float (0.0 to 1.0)
            - reasoning: str
            - rule_id: str
    """
    employee_id = delta['employee_id']
    metric = delta['metric']
    change_type = delta.get('change_type')
    baseline_value = delta.get('baseline_value')
    current_value = delta.get('current_value')
    delta_percentage = delta.get('delta_percentage')

    # RULE 1: BLOCKER - Negative Net Pay
    if metric == 'net_pay' and current_value is not None and current_value < 0:
        return {
            'is_material': True,
            'is_blocker': True,
            'confidence_score': 1.0,
            'reasoning': f'Net pay is negative (${current_value:.2f}). This will fail payroll processing and may violate labor laws. Immediate correction required before approval.',
            'rule_id': 'R001_NEGATIVE_NET_PAY'
        }

    # RULE 2: BLOCKER - Net Pay Decrease > 20%
    if metric == 'net_pay' and change_type == 'decrease' and delta_percentage is not None and delta_percentage < -20:
        return {
            'is_material': True,
            'is_blocker': True,
            'confidence_score': 0.95,
            'reasoning': f'Net pay decreased by {abs(delta_percentage):.1f}% (from ${baseline_value:.2f} to ${current_value:.2f}). Large decreases may indicate errors in deductions or gross pay. Verify accuracy before processing.',
            'rule_id': 'R002_NET_PAY_DECREASE_20PCT'
        }

    # RULE 3: MATERIAL - Net Pay Increase > 50%
    if metric == 'net_pay' and change_type == 'increase' and delta_percentage is not None and delta_percentage > 50:
        return {
            'is_material': True,
            'is_blocker': False,
            'confidence_score': 0.90,
            'reasoning': f'Net pay increased by {delta_percentage:.1f}% (from ${baseline_value:.2f} to ${current_value:.2f}). Typical increases are 2-5%. Verify this is due to promotion, bonus, or other legitimate reason rather than data entry error.',
            'rule_id': 'R003_NET_PAY_INCREASE_50PCT'
        }

    # RULE 4: MATERIAL - Removed Employee
    if change_type == 'removed_employee':
        return {
            'is_material': True,
            'is_blocker': False,
            'confidence_score': 0.85,
            'reasoning': f'Employee {employee_id} removed from payroll. Confirm termination was processed correctly and final pay is accurate. Baseline pay was ${baseline_value:.2f}.',
            'rule_id': 'R004_REMOVED_EMPLOYEE'
        }

    # RULE 5: MATERIAL - New Employee
    if change_type == 'new_employee':
        return {
            'is_material': True,
            'is_blocker': False,
            'confidence_score': 0.75,
            'reasoning': f'New employee {employee_id} added to payroll with net pay of ${current_value:.2f}. Verify onboarding paperwork, tax withholdings, and pay rate are correct.',
            'rule_id': 'R005_NEW_EMPLOYEE'
        }

    # RULE 6: MATERIAL - Gross Pay Decrease > 15%
    if metric == 'gross_pay' and change_type == 'decrease' and delta_percentage is not None and delta_percentage < -15:
        return {
            'is_material': True,
            'is_blocker': False,
            'confidence_score': 0.88,
            'reasoning': f'Gross pay decreased by {abs(delta_percentage):.1f}% (from ${baseline_value:.2f} to ${current_value:.2f}). Verify this reflects actual hours worked or authorized pay reduction.',
            'rule_id': 'R006_GROSS_PAY_DECREASE_15PCT'
        }

    # RULE 7: MATERIAL - Gross Pay Increase > 50%
    if metric == 'gross_pay' and change_type == 'increase' and delta_percentage is not None and delta_percentage > 50:
        return {
            'is_material': True,
            'is_blocker': False,
            'confidence_score': 0.87,
            'reasoning': f'Gross pay increased by {delta_percentage:.1f}% (from ${baseline_value:.2f} to ${current_value:.2f}). Verify this is due to overtime, bonus, or promotion rather than error.',
            'rule_id': 'R007_GROSS_PAY_INCREASE_50PCT'
        }

    # RULE 8: MATERIAL - Deduction Increase > 100%
    if metric == 'total_deductions' and change_type == 'increase' and delta_percentage is not None and delta_percentage > 100:
        return {
            'is_material': True,
            'is_blocker': False,
            'confidence_score': 0.90,
            'reasoning': f'Total deductions more than doubled (from ${baseline_value:.2f} to ${current_value:.2f}, {delta_percentage:.1f}% increase). Verify new deductions are correct and authorized.',
            'rule_id': 'R008_DEDUCTION_INCREASE_100PCT'
        }

    # RULE 9: MATERIAL - Significant Component Changes
    if metric == 'component' and delta_percentage is not None:
        component_name = delta.get('component_name', 'Unknown Component')

        if abs(delta_percentage) > 30:
            return {
                'is_material': True,
                'is_blocker': False,
                'confidence_score': 0.80,
                'reasoning': f'{component_name} changed by {delta_percentage:.1f}% (from ${baseline_value:.2f} to ${current_value:.2f}). Verify this component change is intentional.',
                'rule_id': 'R009_COMPONENT_CHANGE_30PCT'
            }

    # RULE 10: Minor changes (non-material)
    # Net pay changes < 5% are typically not material
    if metric == 'net_pay' and delta_percentage is not None and abs(delta_percentage) < 5:
        return {
            'is_material': False,
            'is_blocker': False,
            'confidence_score': 0.70,
            'reasoning': f'Net pay changed by {delta_percentage:.1f}% (from ${baseline_value:.2f} to ${current_value:.2f}). Small variation within normal range.',
            'rule_id': 'R010_MINOR_NET_PAY_CHANGE'
        }

    # DEFAULT: Moderate changes (material but not blocker)
    if delta_percentage is not None:
        return {
            'is_material': True,
            'is_blocker': False,
            'confidence_score': 0.70,
            'reasoning': f'{metric.replace("_", " ").title()} changed by {delta_percentage:.1f}% (from ${baseline_value:.2f} to ${current_value:.2f}). Review to ensure this change is expected.',
            'rule_id': 'R099_DEFAULT_MATERIAL_CHANGE'
        }

    # Catch-all for edge cases
    return {
        'is_material': False,
        'is_blocker': False,
        'confidence_score': 0.50,
        'reasoning': 'Change detected but does not match standard materiality rules.',
        'rule_id': 'R000_NO_RULE_MATCH'
    }


def apply_judgements(review_session_id: str) -> Dict:
    """
    Apply judgements to all deltas for a review session

    Args:
        review_session_id: UUID of the review session

    Returns:
        Dictionary with success status, judgement count, and any errors
    """
    try:
        # Fetch all deltas for this review session
        deltas_response = supabase.table('payroll_delta') \
            .select('*') \
            .eq('review_session_id', review_session_id) \
            .execute()

        if not deltas_response.data:
            return {
                'success': True,
                'judgement_count': 0,
                'message': 'No deltas found for this review session'
            }

        judgements = []
        material_count = 0
        blocker_count = 0

        # Apply rules to each delta
        for delta in deltas_response.data:
            judgement = apply_rules(delta)

            # Add delta_id to judgement
            judgement['delta_id'] = delta['delta_id']

            judgements.append(judgement)

            if judgement['is_material']:
                material_count += 1
            if judgement['is_blocker']:
                blocker_count += 1

        # Bulk insert judgements into database
        if judgements:
            # Insert in batches of 100 to avoid hitting Supabase limits
            batch_size = 100
            for i in range(0, len(judgements), batch_size):
                batch = judgements[i:i + batch_size]
                supabase.table('material_judgement').insert(batch).execute()

        return {
            'success': True,
            'judgement_count': len(judgements),
            'material_count': material_count,
            'blocker_count': blocker_count
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """
    CLI interface for judgement engine
    Usage: python judgement_engine.py <review_session_id>
    """
    if len(sys.argv) != 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python judgement_engine.py <review_session_id>'
        }))
        sys.exit(1)

    review_session_id = sys.argv[1]
    result = apply_judgements(review_session_id)

    # Output JSON result
    print(json.dumps(result, indent=2))

    # Exit with appropriate code
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
