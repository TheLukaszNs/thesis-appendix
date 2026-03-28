
SELECT
  building,
  COUNT(*) AS total_classrooms,
  SUM(CASE WHEN has_projector THEN 1 ELSE 0 END) AS classrooms_with_projector,
  ROUND(100.0 * SUM(CASE WHEN has_projector THEN 1 ELSE 0 END) / COUNT(*), 2) AS projector_percentage
FROM public.classrooms
GROUP BY building
ORDER BY building
