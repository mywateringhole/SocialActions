-- Monthly spending by council and directorate
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_spending AS
SELECT
  p.council_id,
  p.directorate,
  date_trunc('month', p.payment_date::timestamp)::date AS month,
  COUNT(*) AS transaction_count,
  SUM(p.net_amount::numeric) AS total_amount,
  AVG(p.net_amount::numeric) AS avg_amount
FROM payments p
WHERE p.payment_date IS NOT NULL
GROUP BY p.council_id, p.directorate, date_trunc('month', p.payment_date::timestamp)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_spending
  ON mv_monthly_spending (council_id, directorate, month);

-- Supplier summary by council
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_supplier_summary AS
SELECT
  p.council_id,
  p.supplier_name_normalized,
  COUNT(*) AS transaction_count,
  SUM(p.net_amount::numeric) AS total_amount,
  MIN(p.payment_date) AS first_payment,
  MAX(p.payment_date) AS last_payment
FROM payments p
WHERE p.supplier_name_normalized IS NOT NULL
GROUP BY p.council_id, p.supplier_name_normalized
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_supplier_summary
  ON mv_supplier_summary (council_id, supplier_name_normalized);

-- Expense type summary by council and month
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_expense_summary AS
SELECT
  p.council_id,
  p.expense_type,
  date_trunc('month', p.payment_date::timestamp)::date AS month,
  COUNT(*) AS transaction_count,
  SUM(p.net_amount::numeric) AS total_amount
FROM payments p
WHERE p.payment_date IS NOT NULL AND p.expense_type IS NOT NULL
GROUP BY p.council_id, p.expense_type, date_trunc('month', p.payment_date::timestamp)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_expense_summary
  ON mv_expense_summary (council_id, expense_type, month);
