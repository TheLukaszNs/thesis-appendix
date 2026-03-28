SELECT p.id AS professor_id,
       (p.first_name || ' ' || p.last_name) AS professor_name,
       COUNT(cs.id) AS section_count
FROM public.professors AS p
LEFT JOIN public.course_sections AS cs
  ON cs.professor_id = p.id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY section_count DESC, professor_name ASC;