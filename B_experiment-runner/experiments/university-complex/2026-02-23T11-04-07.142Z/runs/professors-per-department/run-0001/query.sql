SELECT d.name AS department_name, COUNT(p.id) AS professor_count
FROM public.departments AS d
LEFT JOIN public.professors AS p
  ON p.department_id = d.id
GROUP BY d.id, d.name
ORDER BY professor_count DESC, department_name ASC;