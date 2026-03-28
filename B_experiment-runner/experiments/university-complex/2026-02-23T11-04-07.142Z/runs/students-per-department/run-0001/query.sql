SELECT d.name AS department, COUNT(s.id) AS student_count
FROM public.departments d
LEFT JOIN public.students s
  ON s.department_id = d.id
GROUP BY d.id, d.name
ORDER BY student_count DESC, department ASC;