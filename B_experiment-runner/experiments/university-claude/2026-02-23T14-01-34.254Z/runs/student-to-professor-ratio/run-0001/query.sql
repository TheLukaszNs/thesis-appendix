SELECT 
  d.code AS department_code,
  d.name AS department_name,
  COUNT(DISTINCT s.id) AS student_count,
  COUNT(DISTINCT p.id) AS professor_count,
  ROUND(COUNT(DISTINCT s.id)::numeric / NULLIF(COUNT(DISTINCT p.id), 0), 2) AS student_to_professor_ratio
FROM departments d
LEFT JOIN students s ON d.id = s.department_id
LEFT JOIN professors p ON d.id = p.department_id
GROUP BY d.id, d.code, d.name
ORDER BY d.name ASC