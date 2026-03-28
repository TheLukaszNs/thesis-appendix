
SELECT 
  d.name AS department_name,
  d.code AS department_code,
  SUM(s.amount) AS total_scholarship_money,
  COUNT(DISTINCT s.student_id) AS student_count
FROM scholarships s
INNER JOIN students st ON s.student_id = st.id
INNER JOIN departments d ON st.department_id = d.id
GROUP BY d.id, d.name, d.code
ORDER BY total_scholarship_money DESC
