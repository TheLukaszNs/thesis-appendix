
SELECT 
  c.credits,
  ROUND(AVG(CAST(g.exam_score AS NUMERIC)), 2) AS avg_grade,
  COUNT(DISTINCT e.id) AS enrollment_count
FROM courses c
JOIN course_sections cs ON c.id = cs.course_id
JOIN enrollments e ON cs.id = e.course_section_id
JOIN grades g ON e.id = g.enrollment_id
WHERE g.exam_score IS NOT NULL
GROUP BY c.credits
ORDER BY c.credits ASC
