
SELECT 
  c.name AS course_name,
  c.code AS course_code,
  COUNT(cs.id) AS section_count
FROM courses c
INNER JOIN course_sections cs ON c.id = cs.course_id
GROUP BY c.id, c.name, c.code
ORDER BY section_count DESC
