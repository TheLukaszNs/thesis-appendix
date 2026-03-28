WITH totals AS (
  SELECT
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active_count,
    SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END) AS inactive_count
  FROM public.enrollments
)
SELECT
  CASE WHEN e.is_active THEN 'active' ELSE 'inactive' END AS status,
  COUNT(*) AS count,
  totals.active_count::double precision / NULLIF(totals.inactive_count, 0) AS active_to_inactive_ratio
FROM public.enrollments e
CROSS JOIN totals
GROUP BY CASE WHEN e.is_active THEN 'active' ELSE 'inactive' END, totals.active_count, totals.inactive_count
ORDER BY MAX(CASE WHEN e.is_active THEN 0 ELSE 1 END);