SELECT p.id AS professor_id, p.first_name AS first_name, p.last_name AS last_name, ROUND(AVG(ce.professor_rating)::numeric, 2) AS avg_professor_rating, COUNT(ce.id) AS eval_count
FROM public.professors p
JOIN public.course_sections cs ON cs.professor_id = p.id
JOIN public.enrollments e ON e.course_section_id = cs.id
JOIN public.course_evaluations ce ON ce.enrollment_id = e.id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY avg_professor_rating DESC, eval_count DESC, p.last_name ASC, p.first_name ASC
LIMIT 10;