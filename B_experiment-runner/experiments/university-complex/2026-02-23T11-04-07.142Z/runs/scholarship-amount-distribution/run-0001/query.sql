WITH t AS (
  SELECT MIN(amount) AS min_amt, MAX(amount) AS max_amt
  FROM public.scholarships
  WHERE amount IS NOT NULL
), buckets AS (
  SELECT
    CASE WHEN t.min_amt = t.max_amt THEN 1 ELSE width_bucket(s.amount, t.min_amt, t.max_amt, 20) END AS amount_bucket,
    t.min_amt AS min_amt,
    t.max_amt AS max_amt
  FROM public.scholarships s
  CROSS JOIN t
  WHERE s.amount IS NOT NULL
)
SELECT
  amount_bucket AS amount_bucket,
  CASE WHEN min_amt = max_amt THEN min_amt ELSE min_amt + (amount_bucket - 1) * ((max_amt - min_amt) / 20) END AS bucket_start,
  CASE WHEN min_amt = max_amt THEN max_amt ELSE min_amt + amount_bucket * ((max_amt - min_amt) / 20) END AS bucket_end,
  COUNT(*) AS scholarship_count
FROM buckets
GROUP BY amount_bucket, min_amt, max_amt
ORDER BY amount_bucket;