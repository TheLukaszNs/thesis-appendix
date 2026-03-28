SELECT EXTRACT(YEAR FROM enrollment_date)::INT AS enrollment_year,
       AVG(gpa) AS avg_gpa
FROM public.students
WHERE enrollment_date IS NOT NULL
  AND gpa IS NOT NULL
GROUP BY EXTRACT(YEAR FROM enrollment_date)::INT
ORDER BY enrollment_year ASC;