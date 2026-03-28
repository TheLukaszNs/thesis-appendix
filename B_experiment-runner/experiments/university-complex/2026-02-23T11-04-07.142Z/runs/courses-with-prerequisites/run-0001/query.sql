SELECT
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  COUNT(p.prerequisite_course_id) AS prereq_count
FROM public.courses AS c
LEFT JOIN public.prerequisites AS p
  ON p.course_id = c.id
GROUP BY c.id, c.code, c.name
ORDER BY prereq_count DESC, course_code ASC;