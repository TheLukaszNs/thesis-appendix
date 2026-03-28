SELECT
  capacity AS capacity,
  COUNT(*) AS classroom_count,
  ROUND(100.0 * COUNT(*)::numeric / SUM(COUNT(*)) OVER (), 2) AS pct_of_total
FROM public.classrooms
GROUP BY capacity
ORDER BY capacity ASC;