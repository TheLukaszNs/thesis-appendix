SELECT
  academic_year AS academic_year,
  SUM(amount) AS total_scholarship_amount
FROM public.scholarships
WHERE amount IS NOT NULL
  AND academic_year IS NOT NULL
GROUP BY academic_year
ORDER BY academic_year ASC;