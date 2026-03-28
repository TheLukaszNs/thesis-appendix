SELECT grade_value AS grade_value,
       ROUND(AVG(exam_score), 2) AS avg_exam_score
FROM public.grades
WHERE grade_value IS NOT NULL
  AND exam_score IS NOT NULL
GROUP BY grade_value
ORDER BY grade_value ASC;