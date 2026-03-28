
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.hire_date,
  COUNT(ce.id) AS evaluation_count,
  ROUND(AVG(ce.professor_rating)::numeric, 2) AS avg_professor_rating,
  ROUND(AVG(ce.overall_rating)::numeric, 2) AS avg_overall_rating,
  MIN(ce.professor_rating) AS min_professor_rating,
  MAX(ce.professor_rating) AS max_professor_rating
FROM professors p
LEFT JOIN course_sections cs ON p.id = cs.professor_id
LEFT JOIN enrollments e ON cs.id = e.course_section_id
LEFT JOIN course_evaluations ce ON e.id = ce.enrollment_id
WHERE p.hire_date IS NOT NULL AND ce.id IS NOT NULL
GROUP BY p.id, p.first_name, p.last_name, p.hire_date
ORDER BY p.hire_date ASC
