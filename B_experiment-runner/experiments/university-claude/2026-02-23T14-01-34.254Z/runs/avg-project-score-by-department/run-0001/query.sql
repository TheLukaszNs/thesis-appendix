SELECT 
  d.name AS department_name,
  AVG(g.project_score) AS average_project_score
FROM departments d
INNER JOIN courses c ON d.id = c.department_id
INNER JOIN course_sections cs ON c.id = cs.course_id
INNER JOIN enrollments e ON cs.id = e.course_section_id
INNER JOIN grades g ON e.id = g.enrollment_id
WHERE g.project_score IS NOT NULL
GROUP BY d.id, d.name
ORDER BY d.name