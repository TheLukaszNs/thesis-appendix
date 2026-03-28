SELECT 
  c.id,
  c.code,
  c.name,
  AVG(g.attendance_score) AS average_attendance_score
FROM courses c
INNER JOIN course_sections cs ON c.id = cs.course_id
INNER JOIN enrollments e ON cs.id = e.course_section_id
INNER JOIN grades g ON e.id = g.enrollment_id
WHERE g.attendance_score IS NOT NULL
GROUP BY c.id, c.code, c.name
ORDER BY c.code