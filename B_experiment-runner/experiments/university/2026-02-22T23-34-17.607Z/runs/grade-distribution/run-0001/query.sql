WITH total AS (
  SELECT COUNT(*)::bigint AS total_count
  FROM public.grades g
  JOIN public.enrollments e ON g.enrollment_id = e.id
  WHERE g.grade_value IS NOT NULL
)
SELECT
  g.grade_value::text AS grade,
  COUNT(*)::bigint AS count,
  ROUND(100.0 * COUNT(*) / t.total_count, 2) AS percent
FROM public.grades g
JOIN public.enrollments e ON g.enrollment_id = e.id
JOIN total t ON true
WHERE g.grade_value IS NOT NULL
GROUP BY g.grade_value::text, t.total_count
ORDER BY COUNT(*) DESC, g.grade_value::text ASC;