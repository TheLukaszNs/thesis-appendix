
SELECT 
  SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) AS active_count,
  SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) AS inactive_count,
  ROUND(
    SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END)::numeric / 
    NULLIF(SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END), 0),
    2
  ) AS active_to_inactive_ratio
FROM public.enrollments
