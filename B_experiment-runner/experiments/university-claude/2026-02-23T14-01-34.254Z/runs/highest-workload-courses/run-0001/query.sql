
SELECT 
  c.code,
  c.name,
  ROUND(AVG(ce.workload_hours)::numeric, 2) AS avg_workload_hours
FROM courses c
INNER JOIN course_sections cs ON c.id = cs.course_id
INNER JOIN enrollments e ON cs.id = e.course_section_id
INNER JOIN course_evaluations ce ON e.id = ce.enrollment_id
WHERE ce.workload_hours IS NOT NULL
GROUP BY c.id, c.code, c.name
ORDER BY avg_workload_hours DESC
LIMIT 10
