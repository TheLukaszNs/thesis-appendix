
SELECT 
  c.id,
  c.code,
  c.name,
  COUNT(p.id) AS prerequisite_count
FROM courses c
LEFT JOIN prerequisites p ON c.id = p.course_id
GROUP BY c.id, c.code, c.name
ORDER BY prerequisite_count DESC, c.code ASC
