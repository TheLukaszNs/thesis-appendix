
SELECT 
  cs.academic_year,
  ROUND(AVG(CAST(g.exam_score AS NUMERIC)), 2) AS avg_exam_score,
  ROUND(AVG(CAST(g.project_score AS NUMERIC)), 2) AS avg_project_score,
  ROUND(AVG(CAST(g.attendance_score AS NUMERIC)), 2) AS avg_attendance_score,
  COUNT(g.id) AS total_grades
FROM grades g
JOIN enrollments e ON g.enrollment_id = e.id
JOIN course_sections cs ON e.course_section_id = cs.id
WHERE g.exam_score IS NOT NULL 
   OR g.project_score IS NOT NULL 
   OR g.attendance_score IS NOT NULL
GROUP BY cs.academic_year
ORDER BY cs.academic_year ASC
