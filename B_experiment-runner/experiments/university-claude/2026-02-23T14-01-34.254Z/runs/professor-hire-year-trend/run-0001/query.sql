SELECT 
  EXTRACT(YEAR FROM hire_date)::INTEGER AS hire_year,
  COUNT(*) AS num_professors_hired
FROM professors
WHERE hire_date IS NOT NULL
GROUP BY EXTRACT(YEAR FROM hire_date)
ORDER BY hire_year ASC