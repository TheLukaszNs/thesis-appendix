WITH totals AS (
  SELECT COUNT(*) FILTER (WHERE overall_rating IS NOT NULL) AS total
  FROM public.course_evaluations
)
SELECT
  r.rating AS rating,
  COALESCE(c.cnt, 0) AS rating_count,
  CASE WHEN t.total = 0 THEN 0
       ELSE ROUND((COALESCE(c.cnt,0)::numeric / t.total) * 100.0, 2)
  END AS percentage
FROM (VALUES (1),(2),(3),(4),(5)) AS r(rating)
LEFT JOIN (
  SELECT overall_rating, COUNT(*) AS cnt
  FROM public.course_evaluations
  WHERE overall_rating BETWEEN 1 AND 5
  GROUP BY overall_rating
) c ON c.overall_rating = r.rating
CROSS JOIN totals t
ORDER BY r.rating ASC;