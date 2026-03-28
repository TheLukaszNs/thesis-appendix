
SELECT 
  d.name AS department_name,
  g.grade_value AS grade,
  COUNT(*) AS count
FROM grades g
INNER JOIN enrollments e ON g.enrollment_id = e.id
INNER JOIN course_sections cs ON e.course_section_id = cs.id
INNER JOIN courses c ON cs.course_id = c.id
INNER JOIN departments d ON c.department_id = d.id
WHERE g.grade_value IS NOT NULL
GROUP BY d.name, g.grade_value
ORDER BY d.name, g.grade_value DESC
