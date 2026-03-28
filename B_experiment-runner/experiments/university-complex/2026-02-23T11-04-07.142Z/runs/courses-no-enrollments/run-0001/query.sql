SELECT
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  COUNT(e.id) AS enrollment_count
FROM public.courses AS c
LEFT JOIN public.course_sections AS cs ON cs.course_id = c.id
LEFT JOIN public.enrollments AS e ON e.course_section_id = cs.id
GROUP BY c.id, c.code, c.name
HAVING COUNT(e.id) = 0
ORDER BY c.code ASC;