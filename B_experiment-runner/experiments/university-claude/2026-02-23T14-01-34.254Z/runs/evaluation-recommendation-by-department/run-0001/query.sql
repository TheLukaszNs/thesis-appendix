
SELECT 
  d.name AS department_name,
  d.code AS department_code,
  COUNT(ce.id) AS total_evaluations,
  SUM(CASE WHEN ce.would_recommend = true THEN 1 ELSE 0 END) AS recommend_count,
  ROUND(100.0 * SUM(CASE WHEN ce.would_recommend = true THEN 1 ELSE 0 END) / COUNT(ce.id), 2) AS recommend_percentage
FROM course_evaluations ce
INNER JOIN enrollments e ON ce.enrollment_id = e.id
INNER JOIN course_sections cs ON e.course_section_id = cs.id
INNER JOIN courses c ON cs.course_id = c.id
INNER JOIN departments d ON c.department_id = d.id
GROUP BY d.id, d.name, d.code
ORDER BY recommend_percentage DESC, d.name ASC
