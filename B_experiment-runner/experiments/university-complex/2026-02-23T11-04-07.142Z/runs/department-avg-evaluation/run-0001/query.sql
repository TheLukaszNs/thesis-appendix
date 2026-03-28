SELECT d.name AS department_name,
       ROUND(AVG(ce.overall_rating)::numeric, 2) AS avg_overall_rating
FROM public.course_evaluations ce
JOIN public.enrollments e ON ce.enrollment_id = e.id
JOIN public.course_sections cs ON e.course_section_id = cs.id
JOIN public.courses c ON cs.course_id = c.id
JOIN public.departments d ON c.department_id = d.id
GROUP BY d.name
ORDER BY avg_overall_rating DESC, department_name ASC;