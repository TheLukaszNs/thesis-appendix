SELECT d.id AS department_id,
       d.name AS department_name,
       COUNT(DISTINCT p.id) AS professor_count,
       COUNT(cs.id) AS total_sections,
       (COUNT(cs.id)::double precision / NULLIF(COUNT(DISTINCT p.id), 0)) AS avg_sections_per_professor
FROM public.professors p
JOIN public.departments d ON p.department_id = d.id
LEFT JOIN public.course_sections cs ON cs.professor_id = p.id
GROUP BY d.id, d.name
ORDER BY d.name;