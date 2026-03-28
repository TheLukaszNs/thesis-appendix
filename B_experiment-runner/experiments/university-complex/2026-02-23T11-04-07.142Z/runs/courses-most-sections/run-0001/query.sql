SELECT
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  COUNT(cs.id) AS section_count
FROM public.courses AS c
JOIN public.course_sections AS cs
  ON cs.course_id = c.id
GROUP BY c.id, c.code, c.name
ORDER BY section_count DESC, course_code ASC;