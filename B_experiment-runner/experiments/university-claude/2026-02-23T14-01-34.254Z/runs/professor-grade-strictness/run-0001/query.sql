
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  COUNT(DISTINCT g.id) as total_grades,
  ROUND(AVG(g.exam_score)::numeric, 2) as avg_exam_score,
  ROUND(AVG(g.project_score)::numeric, 2) as avg_project_score,
  ROUND(AVG(g.attendance_score)::numeric, 2) as avg_attendance_score,
  ROUND(AVG((COALESCE(g.exam_score, 0) + COALESCE(g.project_score, 0) + COALESCE(g.attendance_score, 0)) / 3)::numeric, 2) as avg_overall_grade
FROM professors p
JOIN course_sections cs ON p.id = cs.professor_id
JOIN enrollments e ON cs.id = e.course_section_id
JOIN grades g ON e.id = g.enrollment_id
GROUP BY p.id, p.first_name, p.last_name
HAVING COUNT(DISTINCT g.id) > 0
ORDER BY avg_overall_grade ASC
