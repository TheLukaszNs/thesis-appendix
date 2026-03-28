SELECT c.id AS course_id, c.code AS course_code, c.name AS course_name
FROM public.courses c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.course_sections cs
  JOIN public.enrollments e ON e.course_section_id = cs.id
  WHERE cs.course_id = c.id
)
ORDER BY c.code ASC