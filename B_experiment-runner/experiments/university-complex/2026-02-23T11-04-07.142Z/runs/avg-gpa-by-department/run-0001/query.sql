SELECT d.id AS department_id, d.name AS department_name, AVG(s.gpa) AS avg_gpa
FROM public.departments AS d
LEFT JOIN public.students AS s
  ON s.department_id = d.id
  AND s.gpa IS NOT NULL
GROUP BY d.id, d.name
ORDER BY d.name ASC;