SELECT 
  d.name AS department_name,
  d.code AS department_code,
  COUNT(DISTINCT e.id) AS total_enrollments,
  COUNT(DISTINCT ce.id) AS total_evaluations,
  ROUND(AVG(ce.overall_rating)::numeric, 2) AS avg_overall_rating,
  ROUND(AVG(ce.professor_rating)::numeric, 2) AS avg_professor_rating,
  ROUND(AVG(ce.content_rating)::numeric, 2) AS avg_content_rating,
  ROUND(AVG(ce.difficulty_rating)::numeric, 2) AS avg_difficulty_rating,
  ROUND(AVG(ce.workload_hours)::numeric, 2) AS avg_workload_hours,
  ROUND(100.0 * SUM(CASE WHEN ce.would_recommend THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT ce.id), 0), 2) AS recommend_percentage
FROM departments d
LEFT JOIN courses c ON d.id = c.department_id
LEFT JOIN course_sections cs ON c.id = cs.course_id
LEFT JOIN enrollments e ON cs.id = e.course_section_id
LEFT JOIN course_evaluations ce ON e.id = ce.enrollment_id
GROUP BY d.id, d.name, d.code
ORDER BY d.name