SELECT d.name AS department_name, c.credits AS credits, COUNT(c.id) AS course_count
FROM public.departments d
JOIN public.courses c ON c.department_id = d.id
GROUP BY d.name, c.credits
ORDER BY d.name, c.credits;