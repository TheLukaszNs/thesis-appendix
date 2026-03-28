SELECT
  'Never taught' AS label,
  COUNT(*) AS professors_never_taught
FROM professors p
LEFT JOIN course_sections s
  ON p.id = s.professor_id
WHERE s.id IS NULL;