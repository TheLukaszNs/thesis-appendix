SELECT
  c.code AS course_code,
  c.name AS course_name,
  AVG(ce.workload_hours) AS avg_workload_hours,
  COUNT(ce.id) AS evaluation_count
FROM public.course_evaluations ce
JOIN public.enrollments e ON ce.enrollment_id = e.id
JOIN public.course_sections cs ON e.course_section_id = cs.id
JOIN public.courses c ON cs.course_id = c.id
WHERE ce.workload_hours IS NOT NULL
GROUP BY c.id, c.code, c.name
HAVING COUNT(ce.id) >= 1
ORDER BY avg_workload_hours DESC, evaluation_count DESC, course_code ASC
LIMIT 10;