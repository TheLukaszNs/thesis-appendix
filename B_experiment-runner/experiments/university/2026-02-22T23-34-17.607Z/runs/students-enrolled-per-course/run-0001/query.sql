SELECT
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  COUNT(DISTINCT e.student_id) AS enrolled_students
FROM public.courses AS c
LEFT JOIN public.course_sections AS cs
  ON cs.course_id = c.id
LEFT JOIN public.enrollments AS e
  ON e.course_section_id = cs.id
  AND e.is_active = true
GROUP BY c.id, c.code, c.name
ORDER BY enrolled_students DESC, c.code ASC;