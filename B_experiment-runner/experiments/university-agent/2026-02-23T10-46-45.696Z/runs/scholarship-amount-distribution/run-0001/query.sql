WITH stats AS (
  SELECT
    MIN(amount) AS min_amount,
    MAX(amount) AS max_amount,
    CASE WHEN MAX(amount)=MIN(amount) THEN 1.0 ELSE (MAX(amount)-MIN(amount))/20.0 END AS bucket_size
  FROM scholarships
),
buckets AS (
  SELECT
    CASE
      WHEN FLOOR((s.amount - st.min_amount) / st.bucket_size) < 0 THEN 0
      WHEN FLOOR((s.amount - st.min_amount) / st.bucket_size) > 19 THEN 19
      ELSE FLOOR((s.amount - st.min_amount) / st.bucket_size)
    END AS bucket_id,
    st.min_amount AS min_amount,
    st.bucket_size AS bucket_size,
    s.amount AS scholarship_amount
  FROM scholarships s
  CROSS JOIN stats st
)
SELECT
  (min_amount + bucket_id * bucket_size) AS bucket_start,
  (min_amount + (bucket_id + 1) * bucket_size) AS bucket_end,
  COUNT(*) AS count
FROM buckets
GROUP BY bucket_id, min_amount, bucket_size
ORDER BY bucket_start;