
SELECT 
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  COUNT(DISTINCT e.id) AS enrollment_count,
  ROUND(AVG(g.exam_score)::NUMERIC, 2) AS avg_grade,
  ROUND(AVG(ce.difficulty_rating)::NUMERIC, 2) AS avg_difficulty_rating
FROM courses c
JOIN course_sections cs ON c.id = cs.course_id
JOIN enrollments e ON cs.id = e.course_section_id
JOIN grades g ON e.id = g.enrollment_id
JOIN course_evaluations ce ON e.id = ce.enrollment_id
WHERE g.exam_score IS NOT NULL 
  AND ce.difficulty_rating IS NOT NULL
GROUP BY c.id, c.code, c.name
ORDER BY c.code
