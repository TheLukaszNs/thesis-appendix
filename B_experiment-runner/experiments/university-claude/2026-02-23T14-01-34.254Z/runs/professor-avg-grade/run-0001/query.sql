SELECT 
  CONCAT(p.first_name, ' ', p.last_name) AS professor_name,
  AVG(CAST(g.exam_score AS NUMERIC)) AS average_grade
FROM professors p
JOIN course_sections cs ON p.id = cs.professor_id
JOIN enrollments e ON cs.id = e.course_section_id
JOIN grades g ON e.id = g.enrollment_id
WHERE g.exam_score IS NOT NULL
GROUP BY p.id, p.first_name, p.last_name
ORDER BY professor_name