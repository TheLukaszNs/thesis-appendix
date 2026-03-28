
SELECT 
  p.id AS professor_id,
  p.first_name,
  p.last_name,
  ROUND(AVG(ce.content_rating)::numeric, 2) AS avg_content_rating,
  ROUND(AVG(ce.professor_rating)::numeric, 2) AS avg_professor_rating,
  COUNT(ce.id) AS evaluation_count
FROM professors p
INNER JOIN course_sections cs ON p.id = cs.professor_id
INNER JOIN enrollments e ON cs.id = e.course_section_id
INNER JOIN course_evaluations ce ON e.id = ce.enrollment_id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY p.last_name, p.first_name
