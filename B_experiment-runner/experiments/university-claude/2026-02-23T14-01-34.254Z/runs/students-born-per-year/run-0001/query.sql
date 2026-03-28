SELECT 
  EXTRACT(YEAR FROM date_of_birth)::INTEGER AS birth_year,
  COUNT(*) AS student_count
FROM students
WHERE date_of_birth IS NOT NULL
GROUP BY EXTRACT(YEAR FROM date_of_birth)
ORDER BY birth_year ASC