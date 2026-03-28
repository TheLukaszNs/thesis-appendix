WITH counts AS (
  SELECT overall_rating AS rating, COUNT(*) AS count
  FROM public.course_evaluations
  WHERE overall_rating IN (1,2,3,4,5)
  GROUP BY overall_rating
)
SELECT r.rating AS rating,
       COALESCE(c.count, 0) AS count
FROM (SELECT generate_series(1, 5) AS rating) AS r
LEFT JOIN counts AS c
  ON r.rating = c.rating
ORDER BY r.rating ASC;