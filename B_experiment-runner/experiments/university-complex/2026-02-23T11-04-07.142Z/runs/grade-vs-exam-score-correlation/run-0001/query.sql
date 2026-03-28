SELECT
  grade_value AS grade_value,
  AVG(exam_score) AS avg_exam_score
FROM public.grades
WHERE exam_score IS NOT NULL
  AND grade_value IS NOT NULL
GROUP BY grade_value
ORDER BY grade_value ASC;