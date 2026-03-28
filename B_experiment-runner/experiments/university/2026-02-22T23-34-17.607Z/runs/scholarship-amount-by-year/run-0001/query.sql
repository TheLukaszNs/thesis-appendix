SELECT academic_year AS academic_year, SUM(amount) AS total_amount
FROM public.scholarships
GROUP BY academic_year
ORDER BY academic_year ASC;