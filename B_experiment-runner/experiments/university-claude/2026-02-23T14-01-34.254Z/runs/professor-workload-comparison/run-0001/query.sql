
SELECT 
  p.id AS professor_id,
  p.first_name,
  p.last_name,
  COUNT(DISTINCT cs.course_id) AS distinct_courses_taught
FROM professors p
LEFT JOIN course_sections cs ON p.id = cs.professor_id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY distinct_courses_taught DESC, p.last_name ASC, p.first_name ASC
