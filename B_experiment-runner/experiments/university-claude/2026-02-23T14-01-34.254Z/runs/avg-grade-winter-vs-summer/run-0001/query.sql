SELECT 
  cs.semester_type,
  ROUND(AVG(g.exam_score)::numeric, 2) AS avg_exam_score,
  ROUND(AVG(g.project_score)::numeric, 2) AS avg_project_score,
  ROUND(AVG(g.attendance_score)::numeric, 2) AS avg_attendance_score,
  ROUND(AVG((COALESCE(g.exam_score, 0) + COALESCE(g.project_score, 0) + COALESCE(g.attendance_score, 0)) / 3)::numeric, 2) AS avg_overall_score
FROM grades g
INNER JOIN enrollments e ON g.enrollment_id = e.id
INNER JOIN course_sections cs ON e.course_section_id = cs.id
GROUP BY cs.semester_type
ORDER BY cs.semester_type;