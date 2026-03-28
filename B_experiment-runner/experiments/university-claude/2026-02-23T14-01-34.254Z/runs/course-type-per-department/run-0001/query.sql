SELECT 
  d.name AS department_name,
  c.course_type,
  COUNT(*) AS course_count
FROM departments d
INNER JOIN courses c ON d.id = c.department_id
GROUP BY d.name, c.course_type
ORDER BY d.name, c.course_type