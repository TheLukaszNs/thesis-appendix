SELECT
  p.id AS professor_id,
  (p.last_name || ', ' || p.first_name) AS professor_name,
  ROUND(AVG(ce.content_rating)::numeric, 2) AS average_content_rating,
  ROUND(AVG(ce.professor_rating)::numeric, 2) AS average_professor_rating,
  COUNT(ce.id) AS evaluation_count
FROM public.professors p
JOIN public.course_sections cs ON cs.professor_id = p.id
JOIN public.enrollments e ON e.course_section_id = cs.id
JOIN public.course_evaluations ce ON ce.enrollment_id = e.id
GROUP BY p.id, p.last_name, p.first_name
ORDER BY p.last_name, p.first_name;