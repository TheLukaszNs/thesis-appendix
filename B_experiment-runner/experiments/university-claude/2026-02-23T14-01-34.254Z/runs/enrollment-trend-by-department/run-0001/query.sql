
SELECT 
  d.name AS department_name,
  cs.academic_year,
  COUNT(e.id) AS enrollment_count
FROM enrollments e
INNER JOIN course_sections cs ON e.course_section_id = cs.id
INNER JOIN courses c ON cs.course_id = c.id
INNER JOIN departments d ON c.department_id = d.id
WHERE e.is_active = true
GROUP BY d.name, cs.academic_year
ORDER BY cs.academic_year ASC, d.name ASC
