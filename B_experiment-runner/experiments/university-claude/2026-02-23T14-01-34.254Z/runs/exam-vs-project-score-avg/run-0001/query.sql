
SELECT 
  d.name AS department,
  ROUND(AVG(g.exam_score)::numeric, 2) AS avg_exam_score,
  ROUND(AVG(g.project_score)::numeric, 2) AS avg_project_score
FROM grades g
INNER JOIN enrollments e ON g.enrollment_id = e.id
INNER JOIN course_sections cs ON e.course_section_id = cs.id
INNER JOIN courses c ON cs.course_id = c.id
INNER JOIN departments d ON c.department_id = d.id
WHERE g.exam_score IS NOT NULL OR g.project_score IS NOT NULL
GROUP BY d.id, d.name
ORDER BY d.name
