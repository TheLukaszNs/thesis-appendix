SELECT
  grade_value AS grade_value,
  ROUND(AVG(exam_score)::numeric, 2) AS avg_exam_score,
  ROUND(AVG(project_score)::numeric, 2) AS avg_project_score,
  ROUND(AVG(attendance_score)::numeric, 2) AS avg_attendance_score
FROM public.grades
GROUP BY grade_value
ORDER BY grade_value