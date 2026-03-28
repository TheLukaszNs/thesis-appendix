SELECT COUNT(p.id) AS never_taught_count
FROM public.professors AS p
LEFT JOIN public.course_sections AS cs
  ON cs.professor_id = p.id
WHERE cs.id IS NULL;