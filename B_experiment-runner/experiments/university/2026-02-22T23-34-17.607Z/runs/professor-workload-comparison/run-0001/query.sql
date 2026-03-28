SELECT p.id AS professor_id,
       p.first_name || ' ' || p.last_name AS professor_name,
       COUNT(DISTINCT cs.course_id) AS distinct_course_count
FROM public.professors p
LEFT JOIN public.course_sections cs
  ON cs.professor_id = p.id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY distinct_course_count DESC, p.last_name ASC, p.first_name ASC;