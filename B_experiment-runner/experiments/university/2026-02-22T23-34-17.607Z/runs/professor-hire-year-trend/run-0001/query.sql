SELECT EXTRACT(YEAR FROM hire_date)::int AS hire_year, COUNT(*) AS professors_hired
FROM public.professors
WHERE hire_date IS NOT NULL
GROUP BY hire_year
ORDER BY hire_year ASC;