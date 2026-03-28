SELECT r.rating AS rating, COALESCE(c.count, 0) AS count
FROM (VALUES (1),(2),(3),(4),(5)) AS r(rating)
LEFT JOIN (
  SELECT CAST(overall_rating AS INTEGER) AS rating, COUNT(*) AS count
  FROM course_evaluations
  WHERE overall_rating IS NOT NULL
    AND CAST(overall_rating AS INTEGER) BETWEEN 1 AND 5
  GROUP BY CAST(overall_rating AS INTEGER)
) c USING (rating)
ORDER BY r.rating ASC;