WITH counts AS (
  SELECT
    COUNT(*) FILTER (WHERE is_active = true)       AS active_count,
    COUNT(*) FILTER (WHERE is_active = false)      AS inactive_count
  FROM public.enrollments
)
SELECT
  active_count AS active_count,
  inactive_count AS inactive_count,
  CASE
    WHEN inactive_count = 0 THEN NULL
    ELSE ROUND((active_count::numeric / inactive_count::numeric)::numeric, 4)
  END AS active_to_inactive_ratio
FROM counts;