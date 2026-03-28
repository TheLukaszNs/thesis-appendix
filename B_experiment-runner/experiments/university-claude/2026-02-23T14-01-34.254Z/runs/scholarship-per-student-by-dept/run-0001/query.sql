
SELECT 
  d.name AS department_name,
  d.code AS department_code,
  ROUND(SUM(s.amount)::numeric / COUNT(DISTINCT s.student_id), 2) AS avg_scholarship_per_student
FROM departments d
LEFT JOIN students st ON d.id = st.department_id
LEFT JOIN scholarships s ON st.id = s.student_id
GROUP BY d.id, d.name, d.code
ORDER BY avg_scholarship_per_student DESC NULLS LAST
