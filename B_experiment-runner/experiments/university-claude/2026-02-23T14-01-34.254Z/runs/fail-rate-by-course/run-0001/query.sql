
SELECT 
  c.code,
  c.name,
  ROUND((COUNT(CASE WHEN (g.grade_value)::text::NUMERIC < 3.0 THEN 1 END)::NUMERIC / COUNT(g.id)::NUMERIC)::NUMERIC, 4) AS failure_rate,
  COUNT(g.id) AS total_grades,
  COUNT(CASE WHEN (g.grade_value)::text::NUMERIC < 3.0 THEN 1 END) AS failed_count
FROM courses c
JOIN course_sections cs ON c.id = cs.course_id
JOIN enrollments e ON cs.id = e.course_section_id
JOIN grades g ON e.id = g.enrollment_id
WHERE g.grade_value IS NOT NULL
GROUP BY c.id, c.code, c.name
ORDER BY failure_rate DESC, c.code ASC
