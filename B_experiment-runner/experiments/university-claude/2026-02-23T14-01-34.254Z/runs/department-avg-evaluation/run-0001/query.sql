
SELECT 
  d.name AS department_name,
  d.code AS department_code,
  ROUND(AVG(ce.overall_rating)::numeric, 2) AS avg_overall_rating
FROM course_evaluations ce
INNER JOIN enrollments e ON ce.enrollment_id = e.id
INNER JOIN course_sections cs ON e.course_section_id = cs.id
INNER JOIN courses c ON cs.course_id = c.id
INNER JOIN departments d ON c.department_id = d.id
GROUP BY d.id, d.name, d.code
ORDER BY d.name
