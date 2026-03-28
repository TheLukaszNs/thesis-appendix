SELECT 
  s.scholarship_type,
  AVG(st.gpa) AS average_gpa
FROM scholarships s
INNER JOIN students st ON s.student_id = st.id
GROUP BY s.scholarship_type
ORDER BY s.scholarship_type;