SELECT 
  d.id,
  d.code,
  d.name,
  SUM(c.credits) AS total_credits
FROM departments d
LEFT JOIN courses c ON d.id = c.department_id
GROUP BY d.id, d.code, d.name
ORDER BY total_credits DESC NULLS LAST, d.name ASC