SELECT EXTRACT(YEAR FROM hire_date)::int AS hire_year, COUNT(id) AS professors_hired
FROM public.professors
WHERE hire_date IS NOT NULL
GROUP BY EXTRACT(YEAR FROM hire_date)::int
ORDER BY hire_year ASC;