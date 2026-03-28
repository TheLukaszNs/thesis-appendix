SELECT
  building AS building,
  100.0 * SUM(CASE WHEN has_projector THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) AS projector_percentage,
  SUM(CASE WHEN has_projector THEN 1 ELSE 0 END) AS projector_count,
  COUNT(*) AS total_count
FROM public.classrooms
GROUP BY building
ORDER BY building ASC;