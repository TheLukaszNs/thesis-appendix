SELECT p.id AS professor_id,
       p.hire_date AS hire_date,
       DATE_PART('year', AGE(current_date, p.hire_date))::integer AS years_since_hire,
       ROUND(AVG(ce.professor_rating)::numeric, 2) AS avg_professor_rating,
       COUNT(ce.id) AS eval_count
FROM public.professors p
JOIN public.course_sections cs ON cs.professor_id = p.id
JOIN public.enrollments e ON e.course_section_id = cs.id
JOIN public.course_evaluations ce ON ce.enrollment_id = e.id
WHERE p.hire_date IS NOT NULL
  AND ce.professor_rating BETWEEN 1 AND 5
GROUP BY p.id, p.hire_date
HAVING COUNT(ce.id) >= 5
ORDER BY years_since_hire ASC, professor_id ASC;