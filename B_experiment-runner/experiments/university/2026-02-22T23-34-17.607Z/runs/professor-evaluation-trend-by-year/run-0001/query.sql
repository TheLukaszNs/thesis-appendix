SELECT cs.academic_year AS academic_year,
       ROUND(AVG(ce.professor_rating)::numeric, 2) AS avg_professor_rating,
       COUNT(ce.id) AS evaluation_count
FROM public.course_evaluations ce
JOIN public.enrollments e ON e.id = ce.enrollment_id
JOIN public.course_sections cs ON cs.id = e.course_section_id
GROUP BY cs.academic_year
ORDER BY CAST(SUBSTRING(cs.academic_year FROM '^\d{4}') AS INTEGER), cs.academic_year;