
SELECT 
  d.name AS department_name,
  d.code AS department_code,
  c.credits,
  COUNT(*) AS course_count
FROM courses c
INNER JOIN departments d ON c.department_id = d.id
GROUP BY d.id, d.name, d.code, c.credits
ORDER BY d.name, c.credits
