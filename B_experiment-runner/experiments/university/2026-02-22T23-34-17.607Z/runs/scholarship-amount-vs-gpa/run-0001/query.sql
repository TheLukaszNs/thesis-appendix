WITH student_buckets AS (
  SELECT
    sc.student_id AS student_id,
    CASE
      WHEN sc.amount = 0 THEN '0'
      WHEN sc.amount BETWEEN 1 AND 999 THEN '$1-999'
      WHEN sc.amount BETWEEN 1000 AND 2499 THEN '$1,000-2,499'
      WHEN sc.amount BETWEEN 2500 AND 4999 THEN '$2,500-4,999'
      WHEN sc.amount BETWEEN 5000 AND 9999 THEN '$5,000-9,999'
      ELSE '$10,000+'
    END AS scholarship_range,
    CASE
      WHEN sc.amount = 0 THEN 0
      WHEN sc.amount BETWEEN 1 AND 999 THEN 1
      WHEN sc.amount BETWEEN 1000 AND 2499 THEN 2
      WHEN sc.amount BETWEEN 2500 AND 4999 THEN 3
      WHEN sc.amount BETWEEN 5000 AND 9999 THEN 4
      ELSE 5
    END AS bucket_rank,
    s.gpa AS gpa
  FROM public.scholarships sc
  JOIN public.students s ON sc.student_id = s.id
  GROUP BY
    sc.student_id,
    s.gpa,
    CASE
      WHEN sc.amount = 0 THEN '0'
      WHEN sc.amount BETWEEN 1 AND 999 THEN '$1-999'
      WHEN sc.amount BETWEEN 1000 AND 2499 THEN '$1,000-2,499'
      WHEN sc.amount BETWEEN 2500 AND 4999 THEN '$2,500-4,999'
      WHEN sc.amount BETWEEN 5000 AND 9999 THEN '$5,000-9,999'
      ELSE '$10,000+'
    END,
    CASE
      WHEN sc.amount = 0 THEN 0
      WHEN sc.amount BETWEEN 1 AND 999 THEN 1
      WHEN sc.amount BETWEEN 1000 AND 2499 THEN 2
      WHEN sc.amount BETWEEN 2500 AND 4999 THEN 3
      WHEN sc.amount BETWEEN 5000 AND 9999 THEN 4
      ELSE 5
    END
)
SELECT
  scholarship_range AS scholarship_range,
  ROUND(AVG(gpa)::numeric, 2) AS average_gpa,
  COUNT(DISTINCT student_id) FILTER (WHERE gpa IS NOT NULL) AS student_count
FROM student_buckets
GROUP BY bucket_rank, scholarship_range
ORDER BY bucket_rank;