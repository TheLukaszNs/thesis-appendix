SELECT d.id AS department_id,
       d.name AS department_name,
       AVG(cs.max_students)::numeric(10,2) AS avg_max_section_size
FROM public.departments AS d
LEFT JOIN public.courses AS c
  ON c.department_id = d.id
LEFT JOIN public.course_sections AS cs
  ON cs.course_id = c.id
GROUP BY d.id, d.name
ORDER BY d.name;
