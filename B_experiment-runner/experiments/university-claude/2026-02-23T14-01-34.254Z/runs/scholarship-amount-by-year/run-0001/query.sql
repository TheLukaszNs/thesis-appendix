SELECT 
  academic_year,
  SUM(amount) AS total_scholarship_amount
FROM public.scholarships
GROUP BY academic_year
ORDER BY academic_year;