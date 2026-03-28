SELECT p.id AS professor_id,
       (p.first_name || ' ' || p.last_name) AS professor_name,
       ROUND(AVG(ce.professor_rating)::numeric, 2) AS avg_professor_rating,
       COUNT(ce.id) AS num_evaluations
FROM public.course_evaluations ce
JOIN public.enrollments e ON ce.enrollment_id = e.id
JOIN public.course_sections cs ON e.course_section_id = cs.id
JOIN public.professors p ON cs.professor_id = p.id
WHERE ce.professor_rating IS NOT NULL
GROUP BY p.id, p.first_name, p.last_name
ORDER BY avg_professor_rating DESC, num_evaluations DESC, professor_name ASC
LIMIT 10;