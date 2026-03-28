WITH student_totals AS (
  SELECT
    s.id AS student_id,
    s.gpa AS gpa,
    SUM(sc.amount) AS total_scholarship
  FROM public.students s
  JOIN public.scholarships sc ON sc.student_id = s.id
  WHERE s.gpa IS NOT NULL
    AND sc.amount IS NOT NULL
  GROUP BY s.id, s.gpa
)
SELECT
  CASE
    WHEN total_scholarship < 1000 THEN '<1k'
    WHEN total_scholarship >= 1000 AND total_scholarship < 5000 THEN '1k-4.9k'
    WHEN total_scholarship >= 5000 AND total_scholarship < 10000 THEN '5k-9.9k'
    ELSE '>=10k'
  END AS amount_range,
  AVG(gpa) AS avg_gpa,
  COUNT(*) AS student_count
FROM student_totals
GROUP BY
  CASE
    WHEN total_scholarship < 1000 THEN '<1k'
    WHEN total_scholarship >= 1000 AND total_scholarship < 5000 THEN '1k-4.9k'
    WHEN total_scholarship >= 5000 AND total_scholarship < 10000 THEN '5k-9.9k'
    ELSE '>=10k'
  END
ORDER BY MIN(total_scholarship) ASC;