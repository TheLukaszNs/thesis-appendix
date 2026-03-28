SELECT d.id AS department_id,
       d.name AS department_name,
       SUM(sch.amount) AS total_scholarship
FROM public.scholarships sch
JOIN public.students s ON sch.student_id = s.id
JOIN public.departments d ON s.department_id = d.id
GROUP BY d.id, d.name
ORDER BY total_scholarship DESC, d.name ASC;