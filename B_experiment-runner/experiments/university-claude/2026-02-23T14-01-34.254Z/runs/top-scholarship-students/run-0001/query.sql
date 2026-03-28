
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  s.email,
  SUM(sch.amount) AS total_scholarship_amount
FROM students s
LEFT JOIN scholarships sch ON s.id = sch.student_id
GROUP BY s.id, s.first_name, s.last_name, s.email
ORDER BY total_scholarship_amount DESC NULLS LAST
