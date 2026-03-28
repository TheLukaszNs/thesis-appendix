SELECT d.name AS department_name, c.course_type AS course_type, COUNT(c.id) AS course_count
FROM public.departments AS d
INNER JOIN public.courses AS c
  ON c.department_id = d.id
GROUP BY d.name, c.course_type
ORDER BY d.name, c.course_type;