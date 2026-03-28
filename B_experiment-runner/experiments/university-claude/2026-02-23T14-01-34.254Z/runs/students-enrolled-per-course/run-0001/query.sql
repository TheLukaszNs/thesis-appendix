SELECT 
  c.id,
  c.code,
  c.name,
  COUNT(e.id) AS enrollment_count
FROM courses c
LEFT JOIN course_sections cs ON c.id = cs.course_id
LEFT JOIN enrollments e ON cs.id = e.course_section_id AND e.is_active = true
GROUP BY c.id, c.code, c.name
ORDER BY c.code