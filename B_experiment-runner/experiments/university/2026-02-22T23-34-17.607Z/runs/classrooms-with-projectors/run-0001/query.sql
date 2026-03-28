SELECT
  building AS building,
  COUNT(*) AS total_classrooms,
  COUNT(*) FILTER (WHERE has_projector) AS projector_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE has_projector) / NULLIF(COUNT(*), 0)::numeric, 2) AS projector_pct
FROM public.classrooms
GROUP BY building
ORDER BY building;