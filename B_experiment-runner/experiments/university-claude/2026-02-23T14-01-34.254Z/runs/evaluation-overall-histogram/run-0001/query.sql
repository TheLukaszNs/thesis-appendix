
SELECT 
  overall_rating,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM course_evaluations
GROUP BY overall_rating
ORDER BY overall_rating ASC
