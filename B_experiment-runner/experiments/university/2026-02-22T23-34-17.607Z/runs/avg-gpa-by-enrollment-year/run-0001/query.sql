SELECT EXTRACT(YEAR FROM s.enrollment_date)::int AS enrollment_year, ROUND(AVG(s.gpa)::numeric, 3) AS average_gpa
FROM public.students AS s
WHERE s.gpa IS NOT NULL
GROUP BY enrollment_year
ORDER BY enrollment_year ASC;