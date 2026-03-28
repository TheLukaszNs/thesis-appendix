
SELECT 
  d.name AS department_name,
  AVG(cs.max_students) AS avg_max_section_size
FROM departments d
INNER JOIN courses c ON d.id = c.department_id
INNER JOIN course_sections cs ON c.id = cs.course_id
GROUP BY d.id, d.name
ORDER BY d.name
