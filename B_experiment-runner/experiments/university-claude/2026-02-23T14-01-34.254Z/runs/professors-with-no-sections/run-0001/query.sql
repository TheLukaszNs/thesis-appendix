SELECT COUNT(p.id) AS professors_never_taught
FROM professors p
LEFT JOIN course_sections cs ON p.id = cs.professor_id
WHERE cs.id IS NULL