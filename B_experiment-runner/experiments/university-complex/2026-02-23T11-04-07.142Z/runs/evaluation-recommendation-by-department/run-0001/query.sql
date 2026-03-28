SELECT d.id AS department_id,
       d.name AS department_name,
       SUM(CASE WHEN ce.would_recommend THEN 1 ELSE 0 END) AS recommended_count,
       COUNT(ce.id) AS total_evaluations,
       100.0 * SUM(CASE WHEN ce.would_recommend THEN 1 ELSE 0 END) / NULLIF(COUNT(ce.id), 0) AS percent_recommended
FROM public.course_evaluations ce
JOIN public.enrollments e ON ce.enrollment_id = e.id
JOIN public.course_sections cs ON e.course_section_id = cs.id
JOIN public.courses c ON cs.course_id = c.id
JOIN public.departments d ON c.department_id = d.id
GROUP BY d.id, d.name
ORDER BY percent_recommended DESC, department_name ASC;