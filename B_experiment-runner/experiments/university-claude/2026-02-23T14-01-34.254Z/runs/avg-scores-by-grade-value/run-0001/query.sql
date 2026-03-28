SELECT 
  grade_value,
  AVG(exam_score) AS avg_exam_score,
  AVG(project_score) AS avg_project_score,
  AVG(attendance_score) AS avg_attendance_score
FROM grades
WHERE grade_value IS NOT NULL
GROUP BY grade_value
ORDER BY grade_value;