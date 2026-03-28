SELECT d.id AS department_id,
       d.name AS department_name,
       COUNT(c.id) AS course_count
FROM public.departments d
LEFT JOIN public.courses c
  ON c.department_id = d.id
GROUP BY d.id, d.name
ORDER BY d.name ASC;