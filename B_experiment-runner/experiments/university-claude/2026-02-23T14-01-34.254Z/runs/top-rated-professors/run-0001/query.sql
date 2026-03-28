
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  ROUND(AVG(ce.professor_rating)::numeric, 2) AS average_professor_rating,
  COUNT(ce.id) AS total_evaluations
FROM professors p
INNER JOIN course_sections cs ON p.id = cs.professor_id
INNER JOIN enrollments e ON cs.id = e.course_section_id
INNER JOIN course_evaluations ce ON e.id = ce.enrollment_id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY average_professor_rating DESC, total_evaluations DESC
LIMIT 10
