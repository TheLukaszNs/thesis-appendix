
SELECT 
  c.code AS course_code,
  c.name AS course_name,
  COUNT(ce.id) AS evaluation_count
FROM courses c
INNER JOIN course_sections cs ON c.id = cs.course_id
INNER JOIN enrollments e ON cs.id = e.course_section_id
INNER JOIN course_evaluations ce ON e.id = ce.enrollment_id
GROUP BY c.id, c.code, c.name
ORDER BY c.code
