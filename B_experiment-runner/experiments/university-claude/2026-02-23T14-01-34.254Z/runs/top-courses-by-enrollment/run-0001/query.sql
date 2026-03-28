SELECT 
  c.id,
  c.code,
  c.name,
  COUNT(e.id) AS total_enrollment
FROM courses c
INNER JOIN course_sections cs ON c.id = cs.course_id
INNER JOIN enrollments e ON cs.id = e.course_section_id
GROUP BY c.id, c.code, c.name
ORDER BY total_enrollment DESC
LIMIT 15