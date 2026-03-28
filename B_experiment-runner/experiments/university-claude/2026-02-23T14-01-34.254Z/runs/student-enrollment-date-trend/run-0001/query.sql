
SELECT 
  EXTRACT(YEAR FROM s.enrollment_date)::INTEGER AS enrollment_year,
  COUNT(s.id) AS student_count
FROM students s
GROUP BY EXTRACT(YEAR FROM s.enrollment_date)
ORDER BY enrollment_year ASC
