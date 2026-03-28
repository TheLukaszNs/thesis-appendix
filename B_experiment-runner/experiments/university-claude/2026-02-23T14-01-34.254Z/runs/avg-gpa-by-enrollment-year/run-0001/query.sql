SELECT 
  EXTRACT(YEAR FROM enrollment_date)::INTEGER AS enrollment_year,
  ROUND(AVG(gpa)::NUMERIC, 2) AS average_gpa,
  COUNT(*) AS student_count
FROM students
WHERE gpa IS NOT NULL
GROUP BY EXTRACT(YEAR FROM enrollment_date)
ORDER BY enrollment_year ASC