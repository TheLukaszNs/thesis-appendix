SELECT d.id AS department_id, d.name AS department_name, s.current_semester AS current_semester, COUNT(s.id) AS student_count
FROM public.departments d
LEFT JOIN public.students s
  ON s.department_id = d.id
GROUP BY d.id, d.name, s.current_semester
ORDER BY d.name ASC, s.current_semester ASC NULLS LAST;