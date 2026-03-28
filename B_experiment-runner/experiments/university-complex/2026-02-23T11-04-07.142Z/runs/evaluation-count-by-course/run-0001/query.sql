SELECT
  cs.course_id AS course_id,
  COUNT(ce.id) AS evaluations_count
FROM public.course_evaluations ce
JOIN public.enrollments e ON ce.enrollment_id = e.id
JOIN public.course_sections cs ON e.course_section_id = cs.id
GROUP BY cs.course_id
ORDER BY cs.course_id ASC;