
SELECT 
  cs.academic_year,
  ROUND(AVG(ce.professor_rating)::numeric, 2) AS avg_professor_rating,
  COUNT(ce.id) AS evaluation_count
FROM course_evaluations ce
INNER JOIN enrollments e ON ce.enrollment_id = e.id
INNER JOIN course_sections cs ON e.course_section_id = cs.id
GROUP BY cs.academic_year
ORDER BY cs.academic_year ASC
