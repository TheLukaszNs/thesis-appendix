SELECT c.id AS course_id, c.code AS course_code, c.name AS course_name, COUNT(cs.id) AS sections_offered
FROM public.courses AS c
LEFT JOIN public.course_sections AS cs ON cs.course_id = c.id
GROUP BY c.id, c.code, c.name
ORDER BY sections_offered DESC, c.code ASC, c.name ASC;