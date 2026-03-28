SELECT 
  cs.semester_type,
  c.course_type,
  ROUND(AVG((g.grade_value::text)::NUMERIC), 2) AS avg_grade,
  COUNT(g.id) AS grade_count
FROM grades g
JOIN enrollments e ON g.enrollment_id = e.id
JOIN course_sections cs ON e.course_section_id = cs.id
JOIN courses c ON cs.course_id = c.id
WHERE g.grade_value IS NOT NULL
GROUP BY cs.semester_type, c.course_type
ORDER BY cs.semester_type, c.course_type