SELECT
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  ROUND(AVG(ce.workload_hours)::numeric, 2) AS average_workload_hours
FROM public.courses c
LEFT JOIN public.course_sections cs ON cs.course_id = c.id
LEFT JOIN public.enrollments en ON en.course_section_id = cs.id
LEFT JOIN public.course_evaluations ce ON ce.enrollment_id = en.id
GROUP BY c.id, c.code, c.name
ORDER BY c.code ASC;