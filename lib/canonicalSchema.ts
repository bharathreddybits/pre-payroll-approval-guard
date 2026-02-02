/**
 * PayrollShield Canonical Schema
 *
 * Single source of truth for the internal payroll data model.
 * All uploaded files are mapped to this schema before processing.
 * Judgement rules execute only against these canonical fields.
 */

export type FieldCategory = 'identity' | 'hours' | 'earnings' | 'taxes' | 'deductions' | 'fundamental';
export type FieldDataType = 'string' | 'decimal' | 'date' | 'array';

export interface CanonicalField {
  /** Internal canonical name used in code and DB */
  name: string;
  /** Human-readable label for UI display */
  label: string;
  /** Schema category */
  category: FieldCategory;
  /** Data type */
  dataType: FieldDataType;
  /** Whether this field is required for processing */
  required: boolean;
  /** Common synonyms/aliases for AI and mock column mapping */
  aliases: string[];
  /** Description shown in mapping UI */
  description: string;
  /** DB column name in employee_pay_record (null if stored in pay_component or metadata) */
  dbColumn: string | null;
}

// ---------------------------------------------------------------------------
// Canonical Fields Definition
// ---------------------------------------------------------------------------

export const CANONICAL_FIELDS: CanonicalField[] = [
  // ── Employee Identity & Context ──────────────────────────────────────────
  {
    name: 'EmployeeID',
    label: 'Employee ID',
    category: 'identity',
    dataType: 'string',
    required: true,
    aliases: [
      'employee_id', 'emp_id', 'employeeid', 'empid', 'employee no', 'employee number',
      'staff id', 'staff number', 'worker id', 'id', 'ee id', 'personnel number',
      'badge number', 'payroll id', 'emp no', 'emp #', 'employee #',
    ],
    description: 'Unique identifier for each employee',
    dbColumn: 'employee_id',
  },
  {
    name: 'EmployeeName',
    label: 'Employee Name',
    category: 'identity',
    dataType: 'string',
    required: false,
    aliases: [
      'employee_name', 'employeename', 'name', 'full name', 'fullname',
      'emp name', 'empname', 'worker name', 'staff name', 'employee full name',
    ],
    description: 'Full name of the employee',
    dbColumn: 'employee_name',
  },
  {
    name: 'Employment_Status',
    label: 'Employment Status',
    category: 'identity',
    dataType: 'string',
    required: false,
    aliases: [
      'employment_status', 'status', 'emp status', 'employee status',
      'employment status', 'active status', 'work status', 'pay status',
    ],
    description: 'Active, Terminated, Leave, etc.',
    dbColumn: 'employment_status',
  },
  {
    name: 'Pay_Group',
    label: 'Pay Group',
    category: 'identity',
    dataType: 'string',
    required: false,
    aliases: [
      'pay_group', 'paygroup', 'pay group', 'payroll group', 'group',
      'compensation group', 'pay class',
    ],
    description: 'Pay group or classification',
    dbColumn: 'pay_group',
  },
  {
    name: 'Pay_Frequency',
    label: 'Pay Frequency',
    category: 'identity',
    dataType: 'string',
    required: false,
    aliases: [
      'pay_frequency', 'payfrequency', 'pay frequency', 'frequency',
      'pay cycle', 'pay period type', 'pay schedule',
      'weekly', 'biweekly', 'semimonthly', 'monthly',
    ],
    description: 'Weekly, Bi-weekly, Semi-monthly, Monthly',
    dbColumn: 'pay_frequency',
  },
  {
    name: 'PayPeriodStart',
    label: 'Pay Period Start',
    category: 'identity',
    dataType: 'date',
    required: false,
    aliases: [
      'payperiodstart', 'pay_period_start', 'period start', 'period_start',
      'pay period start', 'start date', 'period begin', 'pp start',
    ],
    description: 'Start date of the pay period (YYYY-MM-DD)',
    dbColumn: null, // stored in metadata or payroll_dataset
  },
  {
    name: 'PayPeriodEnd',
    label: 'Pay Period End',
    category: 'identity',
    dataType: 'date',
    required: false,
    aliases: [
      'payperiodend', 'pay_period_end', 'period end', 'period_end',
      'pay period end', 'end date', 'period ending', 'pp end',
    ],
    description: 'End date of the pay period (YYYY-MM-DD)',
    dbColumn: null,
  },
  {
    name: 'PayDate',
    label: 'Pay Date',
    category: 'identity',
    dataType: 'date',
    required: false,
    aliases: [
      'paydate', 'pay_date', 'pay date', 'check date', 'payment date',
      'payday', 'disbursement date',
    ],
    description: 'Date payment is issued (YYYY-MM-DD)',
    dbColumn: null,
  },
  {
    name: 'Department',
    label: 'Department',
    category: 'identity',
    dataType: 'string',
    required: false,
    aliases: [
      'department', 'dept', 'division', 'cost center', 'cost_center',
      'business unit', 'org unit', 'team',
    ],
    description: 'Department or organizational unit',
    dbColumn: 'department',
  },

  // ── Hours Components ─────────────────────────────────────────────────────
  {
    name: 'RegularHours',
    label: 'Regular Hours',
    category: 'hours',
    dataType: 'decimal',
    required: false,
    aliases: [
      'regularhours', 'regular_hours', 'regular hours', 'reg hours',
      'standard hours', 'normal hours', 'base hours',
    ],
    description: 'Regular hours worked',
    dbColumn: 'regular_hours',
  },
  {
    name: 'OvertimeHours',
    label: 'Overtime Hours',
    category: 'hours',
    dataType: 'decimal',
    required: false,
    aliases: [
      'overtimehours', 'overtime_hours', 'overtime hours', 'ot hours',
      'ot_hours', 'overtime', 'extra hours',
    ],
    description: 'Overtime hours worked',
    dbColumn: 'overtime_hours',
  },
  {
    name: 'OtherPaidHours',
    label: 'Other Paid Hours',
    category: 'hours',
    dataType: 'decimal',
    required: false,
    aliases: [
      'otherpaidhours', 'other_paid_hours', 'other paid hours', 'pto hours',
      'vacation hours', 'sick hours', 'holiday hours', 'other hours',
    ],
    description: 'PTO, vacation, sick, holiday hours',
    dbColumn: 'other_paid_hours',
  },
  {
    name: 'TotalHoursWorked',
    label: 'Total Hours Worked',
    category: 'hours',
    dataType: 'decimal',
    required: false,
    aliases: [
      'totalhoursworked', 'total_hours_worked', 'total hours worked',
      'total hours', 'total_hours', 'hours worked', 'hours_worked',
    ],
    description: 'Total hours (regular + overtime + other)',
    dbColumn: 'total_hours_worked',
  },

  // ── Earnings Components ──────────────────────────────────────────────────
  {
    name: 'Base_Earnings',
    label: 'Base Earnings',
    category: 'earnings',
    dataType: 'decimal',
    required: false,
    aliases: [
      'base_earnings', 'baseearnings', 'base earnings', 'base pay',
      'base salary', 'regular pay', 'regular earnings', 'salary',
    ],
    description: 'Base/regular earnings amount',
    dbColumn: 'base_earnings',
  },
  {
    name: 'OvertimePay',
    label: 'Overtime Pay',
    category: 'earnings',
    dataType: 'decimal',
    required: false,
    aliases: [
      'overtimepay', 'overtime_pay', 'overtime pay', 'ot pay', 'ot_pay',
      'overtime earnings', 'ot earnings',
    ],
    description: 'Overtime earnings amount',
    dbColumn: 'overtime_pay',
  },
  {
    name: 'Bonus_Earnings',
    label: 'Bonus Earnings',
    category: 'earnings',
    dataType: 'decimal',
    required: false,
    aliases: [
      'bonus_earnings', 'bonusearnings', 'bonus earnings', 'bonus',
      'bonus pay', 'incentive', 'incentive pay', 'commission',
    ],
    description: 'Bonus or incentive earnings',
    dbColumn: 'bonus_earnings',
  },
  {
    name: 'Other_Earnings',
    label: 'Other Earnings',
    category: 'earnings',
    dataType: 'decimal',
    required: false,
    aliases: [
      'other_earnings', 'otherearnings', 'other earnings', 'other pay',
      'misc earnings', 'additional earnings', 'supplemental pay',
    ],
    description: 'Other/miscellaneous earnings',
    dbColumn: 'other_earnings',
  },

  // ── Taxes Components ─────────────────────────────────────────────────────
  {
    name: 'FederalIncomeTaxWithheld',
    label: 'Federal Income Tax',
    category: 'taxes',
    dataType: 'decimal',
    required: false,
    aliases: [
      'federalincometaxwithheld', 'federal_income_tax_withheld', 'federal income tax',
      'federal tax', 'fed tax', 'fit', 'federal withholding', 'fed income tax',
      'federal_income_tax', 'fed_tax',
    ],
    description: 'Federal income tax withheld',
    dbColumn: 'federal_income_tax',
  },
  {
    name: 'SocialSecurityWithheld',
    label: 'Social Security Tax',
    category: 'taxes',
    dataType: 'decimal',
    required: false,
    aliases: [
      'socialsecuritywithheld', 'social_security_withheld', 'social security',
      'ss tax', 'fica ss', 'oasdi', 'social security tax', 'ss_tax',
      'social_security_tax', 'fica_ss',
    ],
    description: 'Social Security (OASDI) tax withheld',
    dbColumn: 'social_security_tax',
  },
  {
    name: 'MedicareWithheld',
    label: 'Medicare Tax',
    category: 'taxes',
    dataType: 'decimal',
    required: false,
    aliases: [
      'medicarewithheld', 'medicare_withheld', 'medicare', 'medicare tax',
      'fica medicare', 'med tax', 'medicare_tax', 'fica_med',
    ],
    description: 'Medicare tax withheld',
    dbColumn: 'medicare_tax',
  },
  {
    name: 'StateIncomeTaxWithheld',
    label: 'State Income Tax',
    category: 'taxes',
    dataType: 'decimal',
    required: false,
    aliases: [
      'stateincometaxwithheld', 'state_income_tax_withheld', 'state income tax',
      'state tax', 'sit', 'state withholding', 'state_income_tax', 'state_tax',
    ],
    description: 'State income tax withheld',
    dbColumn: 'state_income_tax',
  },
  {
    name: 'LocalTaxWithheld',
    label: 'Local Tax',
    category: 'taxes',
    dataType: 'decimal',
    required: false,
    aliases: [
      'localtaxwithheld', 'local_tax_withheld', 'local tax', 'city tax',
      'county tax', 'municipal tax', 'local_tax', 'local withholding',
    ],
    description: 'Local/city/county tax withheld',
    dbColumn: 'local_tax',
  },

  // ── Deductions Components ────────────────────────────────────────────────
  {
    name: 'TotalDeductions',
    label: 'Total Deductions',
    category: 'deductions',
    dataType: 'decimal',
    required: true,
    aliases: [
      'totaldeductions', 'total_deductions', 'total deductions', 'deductions',
      'total deduction', 'deduction total', 'all deductions',
    ],
    description: 'Total deductions amount',
    dbColumn: 'total_deductions',
  },
  // Note: DeductionComponents (array) is handled via the pay_component table,
  // not as a single canonical field.

  // ── Fundamental Pay Components ───────────────────────────────────────────
  {
    name: 'GrossPay',
    label: 'Gross Pay',
    category: 'fundamental',
    dataType: 'decimal',
    required: true,
    aliases: [
      'grosspay', 'gross_pay', 'gross pay', 'gross', 'gross earnings',
      'gross salary', 'total earnings', 'gross wages', 'total pay',
    ],
    description: 'Total gross pay before deductions',
    dbColumn: 'gross_pay',
  },
  {
    name: 'NetPay',
    label: 'Net Pay',
    category: 'fundamental',
    dataType: 'decimal',
    required: true,
    aliases: [
      'netpay', 'net_pay', 'net pay', 'net', 'take home', 'take_home',
      'take home pay', 'net earnings', 'net wages', 'net amount',
    ],
    description: 'Net pay after all deductions',
    dbColumn: 'net_pay',
  },
];

// ---------------------------------------------------------------------------
// Derived Exports
// ---------------------------------------------------------------------------

/** Fields that are required for minimum viable processing (free tier) */
export const CANONICAL_REQUIRED_FIELDS = CANONICAL_FIELDS.filter(f => f.required);

/** Numeric fields used for delta calculation between baseline and current */
export const CANONICAL_NUMERIC_FIELDS = CANONICAL_FIELDS.filter(
  f => f.dataType === 'decimal' && f.dbColumn !== null
);

/** All field names as a union type */
export type CanonicalFieldName = typeof CANONICAL_FIELDS[number]['name'];

/** Map from canonical name → field definition for fast lookup */
export const CANONICAL_FIELD_MAP = new Map(
  CANONICAL_FIELDS.map(f => [f.name, f])
);

/** Map from DB column → canonical field for reverse lookup */
export const DB_COLUMN_TO_CANONICAL = new Map(
  CANONICAL_FIELDS.filter(f => f.dbColumn).map(f => [f.dbColumn!, f])
);

/**
 * Typed interface for a fully-mapped canonical employee record.
 * All fields are optional except EmployeeID (the join key).
 */
export interface CanonicalRecord {
  EmployeeID: string;
  EmployeeName?: string;
  Employment_Status?: string;
  Pay_Group?: string;
  Pay_Frequency?: string;
  PayPeriodStart?: string;
  PayPeriodEnd?: string;
  PayDate?: string;
  Department?: string;
  RegularHours?: number;
  OvertimeHours?: number;
  OtherPaidHours?: number;
  TotalHoursWorked?: number;
  Base_Earnings?: number;
  OvertimePay?: number;
  Bonus_Earnings?: number;
  Other_Earnings?: number;
  FederalIncomeTaxWithheld?: number;
  SocialSecurityWithheld?: number;
  MedicareWithheld?: number;
  StateIncomeTaxWithheld?: number;
  LocalTaxWithheld?: number;
  TotalDeductions?: number;
  GrossPay?: number;
  NetPay?: number;
}

/**
 * Returns CSV header row for the import template.
 * Uses the canonical field names as headers.
 */
export function getTemplateHeaders(): string[] {
  return CANONICAL_FIELDS
    .filter(f => f.dataType !== 'array') // exclude DeductionComponents array
    .map(f => f.name);
}
