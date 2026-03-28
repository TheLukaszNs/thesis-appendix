SELECT 
  c.course_type,
  AVG(CAST(g.exam_score AS NUMERIC)) AS average_grade
FROM courses c
JOIN course_sections cs ON c.id = cs.course_id
JOIN enrollments e ON cs.id = e.course_section_id
JOIN grades g ON e.id = g.enrollment_id
WHERE g.exam_score IS NOT NULL
GROUP BY c.course_type
ORDER BY c.course_type