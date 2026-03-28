
SELECT 
  p.id AS professor_id,
  p.first_name,
  p.last_name,
  ROUND(AVG(ce.overall_rating)::numeric, 2) AS average_overall_rating
FROM professors p
INNER JOIN course_sections cs ON p.id = cs.professor_id
INNER JOIN enrollments e ON cs.id = e.course_section_id
INNER JOIN course_evaluations ce ON e.id = ce.enrollment_id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY average_overall_rating DESC, p.last_name ASC, p.first_name ASC
