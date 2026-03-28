SELECT EXTRACT(YEAR FROM hire_date) AS hire_year, COUNT(*) AS hires_count
FROM professors
WHERE hire_date IS NOT NULL
GROUP BY hire_year
ORDER BY hire_year ASC;