
SELECT
  CASE WHEN p.course_id IS NULL THEN 'No prerequisites' ELSE 'At least one prerequisite' END AS prerequisite_status,
  COUNT(DISTINCT c.id) AS course_count
FROM courses c
LEFT JOIN prerequisites p ON c.id = p.course_id
GROUP BY prerequisite_status
ORDER BY prerequisite_status DESC
