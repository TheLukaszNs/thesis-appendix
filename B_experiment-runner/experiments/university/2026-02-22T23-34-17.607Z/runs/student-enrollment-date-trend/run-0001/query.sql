SELECT (EXTRACT(YEAR FROM enrollment_date))::int AS year,
       COUNT(DISTINCT student_id) AS student_count
FROM public.enrollments
GROUP BY (EXTRACT(YEAR FROM enrollment_date))::int
ORDER BY year ASC;