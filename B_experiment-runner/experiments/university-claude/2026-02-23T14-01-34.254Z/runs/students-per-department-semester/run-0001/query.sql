
SELECT 
  d.name AS department,
  s.current_semester AS semester,
  COUNT(s.id) AS student_count
FROM students s
INNER JOIN departments d ON s.department_id = d.id
GROUP BY d.name, s.current_semester
ORDER BY d.name, s.current_semester
