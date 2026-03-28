WITH stats AS (
  SELECT
    MIN(amount) AS min_amount,
    MAX(amount) AS max_amount,
    COUNT(*) AS total_count
  FROM public.scholarships
), buckets AS (
  SELECT
    width_bucket(s.amount, st.min_amount, st.max_amount, 10) AS bucket
  FROM public.scholarships s
  CROSS JOIN stats st
), grp AS (
  SELECT
    bucket AS bucket_number,
    COUNT(*) AS cnt
  FROM buckets
  GROUP BY bucket
)
SELECT
  g.bucket_number AS bucket_number,
  CASE
    WHEN g.bucket_number = 0 THEN NULL
    ELSE ROUND((st.min_amount + ((g.bucket_number - 1)::numeric / 10) * (st.max_amount - st.min_amount))::numeric, 2)
  END AS bucket_min,
  CASE
    WHEN g.bucket_number = 0 THEN NULL
    ELSE ROUND((st.min_amount + (g.bucket_number::numeric / 10) * (st.max_amount - st.min_amount))::numeric, 2)
  END AS bucket_max,
  g.cnt AS count,
  ROUND(100.0 * g.cnt / st.total_count::numeric, 2) AS pct,
  ROUND(100.0 * SUM(g.cnt) OVER (ORDER BY g.bucket_number) / st.total_count::numeric, 2) AS cumulative_pct
FROM grp g
CROSS JOIN stats st
ORDER BY g.bucket_number;