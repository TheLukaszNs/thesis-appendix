SELECT
  c.id AS course_id,
  c.name AS course_name,
  COUNT(e.id) FILTER (WHERE e.is_active = true) AS total_enrollments
FROM public.courses c
JOIN public.course_sections cs ON cs.course_id = c.id
JOIN public.enrollments e ON e.course_section_id = cs.id
WHERE e.is_active = true
GROUP BY c.id, c.name
ORDER BY total_enrollments DESC, course_name ASC
LIMIT 15;