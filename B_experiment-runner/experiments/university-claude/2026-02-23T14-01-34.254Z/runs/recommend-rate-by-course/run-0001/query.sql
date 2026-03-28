
SELECT 
  c.code,
  c.name,
  COUNT(ce.id) AS total_evaluations,
  SUM(CASE WHEN ce.would_recommend THEN 1 ELSE 0 END) AS recommend_count,
  ROUND(100.0 * SUM(CASE WHEN ce.would_recommend THEN 1 ELSE 0 END) / COUNT(ce.id), 2) AS recommend_percentage
FROM courses c
INNER JOIN course_sections cs ON c.id = cs.course_id
INNER JOIN enrollments e ON cs.id = e.course_section_id
INNER JOIN course_evaluations ce ON e.id = ce.enrollment_id
GROUP BY c.id, c.code, c.name
ORDER BY recommend_percentage DESC, c.code
