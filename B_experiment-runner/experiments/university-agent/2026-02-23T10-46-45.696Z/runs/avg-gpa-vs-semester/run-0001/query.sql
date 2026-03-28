SELECT
  current_semester AS current_semester,
  ROUND(AVG(gpa), 2) AS average_gpa,
  COUNT(*) AS student_count
FROM students
GROUP BY current_semester
ORDER BY current_semester ASC;