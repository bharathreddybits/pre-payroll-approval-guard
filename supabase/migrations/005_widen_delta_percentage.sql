-- Widen delta_percentage from NUMERIC(5,2) to NUMERIC(10,2)
-- The old type could only store values up to 999.99%, causing overflow
-- when percentage changes exceeded that (e.g., deductions 500 -> 6000 = 1100%).
ALTER TABLE payroll_delta ALTER COLUMN delta_percentage TYPE NUMERIC(10, 2);
