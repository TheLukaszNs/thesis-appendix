SELECT d.id AS department_id,
       d.code AS department_code,
       d.name AS department_name,
       COUNT(s.id) AS student_count
FROM public.departments AS d
LEFT JOIN public.students AS s
  ON s.department_id = d.id
GROUP BY d.id, d.code, d.name
ORDER BY student_count DESC, department_name ASC;