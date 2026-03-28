SELECT d.name AS department_name, s.current_semester AS current_semester, COUNT(s.id) AS student_count
FROM public.students AS s
JOIN public.departments AS d ON s.department_id = d.id
GROUP BY d.name, s.current_semester
ORDER BY d.name ASC, s.current_semester ASC