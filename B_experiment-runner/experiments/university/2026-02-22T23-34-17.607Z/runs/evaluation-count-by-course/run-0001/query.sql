SELECT c.id AS course_id,
       c.code AS course_code,
       c.name AS course_name,
       COUNT(DISTINCT ce.id) AS evaluation_count
FROM public.courses c
LEFT JOIN public.course_sections cs ON cs.course_id = c.id
LEFT JOIN public.enrollments e ON e.course_section_id = cs.id
LEFT JOIN public.course_evaluations ce ON ce.enrollment_id = e.id
GROUP BY c.id, c.code, c.name
ORDER BY evaluation_count DESC, c.code ASC;