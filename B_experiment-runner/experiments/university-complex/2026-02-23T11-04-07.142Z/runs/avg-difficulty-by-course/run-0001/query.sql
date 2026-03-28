SELECT c.id AS course_id,
       c.code AS course_code,
       c.name AS course_name,
       ROUND(AVG(ce.difficulty_rating)::numeric, 2) AS avg_difficulty
FROM public.course_evaluations ce
JOIN public.enrollments e ON ce.enrollment_id = e.id
JOIN public.course_sections cs ON e.course_section_id = cs.id
JOIN public.courses c ON cs.course_id = c.id
WHERE ce.difficulty_rating IS NOT NULL
GROUP BY c.id, c.code, c.name
ORDER BY c.code;