SELECT 
  grade_value,
  AVG(exam_score) AS average_exam_score
FROM public.grades
WHERE exam_score IS NOT NULL
GROUP BY grade_value
ORDER BY grade_value;