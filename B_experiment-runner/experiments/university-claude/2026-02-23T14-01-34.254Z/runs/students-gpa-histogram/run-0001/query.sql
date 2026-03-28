
SELECT 
  CASE 
    WHEN calculated_gpa < 1.0 THEN '0.0-1.0'
    WHEN calculated_gpa < 2.0 THEN '1.0-2.0'
    WHEN calculated_gpa < 3.0 THEN '2.0-3.0'
    WHEN calculated_gpa < 4.0 THEN '3.0-4.0'
    ELSE '4.0+'
  END AS gpa_range,
  COUNT(*) AS student_count
FROM student_gpa_summary
WHERE calculated_gpa IS NOT NULL
GROUP BY gpa_range
ORDER BY gpa_range
