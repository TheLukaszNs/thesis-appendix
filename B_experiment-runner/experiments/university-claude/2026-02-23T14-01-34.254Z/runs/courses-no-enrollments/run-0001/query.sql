
SELECT DISTINCT
  c.id,
  c.code,
  c.name,
  c.credits
FROM courses c
LEFT JOIN course_sections cs ON c.id = cs.course_id
LEFT JOIN enrollments e ON cs.id = e.course_section_id
WHERE e.id IS NULL
ORDER BY c.code
