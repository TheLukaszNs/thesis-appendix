SELECT d.name AS department_name, COALESCE(SUM(c.credits), 0) AS total_credits
FROM public.departments AS d
LEFT JOIN public.courses AS c ON d.id = c.department_id
GROUP BY d.id, d.name
ORDER BY d.name ASC;