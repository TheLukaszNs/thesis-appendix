SELECT c.code AS course_code,
       c.name AS course_name,
       AVG(ce.workload_hours) AS avg_workload_hours
FROM public.course_evaluations AS ce
JOIN public.enrollments AS e ON ce.enrollment_id = e.id
JOIN public.course_sections AS cs ON e.course_section_id = cs.id
JOIN public.courses AS c ON cs.course_id = c.id
WHERE ce.workload_hours IS NOT NULL
GROUP BY c.code, c.name
ORDER BY c.code ASC;