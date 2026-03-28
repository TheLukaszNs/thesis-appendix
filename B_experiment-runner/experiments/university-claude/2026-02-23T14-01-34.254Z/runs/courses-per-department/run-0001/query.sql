SELECT 
  d.name AS department_name,
  COUNT(c.id) AS course_count
FROM departments d
LEFT JOIN courses c ON d.id = c.department_id
GROUP BY d.id, d.name
ORDER BY d.name