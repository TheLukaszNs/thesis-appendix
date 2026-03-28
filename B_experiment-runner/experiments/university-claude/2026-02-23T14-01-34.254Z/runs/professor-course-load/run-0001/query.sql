SELECT 
  p.id,
  p.first_name,
  p.last_name,
  COUNT(cs.id) AS section_count
FROM professors p
LEFT JOIN course_sections cs ON p.id = cs.professor_id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY section_count DESC, p.last_name ASC, p.first_name ASC