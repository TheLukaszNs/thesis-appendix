SELECT
  CONCAT(p.first_name, ' ', p.last_name) AS professor_name,
  ROUND(AVG(ce.overall_rating)::numeric, 2) AS avg_overall_rating
FROM public.course_evaluations AS ce
JOIN public.enrollments AS e ON ce.enrollment_id = e.id
JOIN public.course_sections AS cs ON e.course_section_id = cs.id
JOIN public.professors AS p ON cs.professor_id = p.id
WHERE ce.overall_rating IS NOT NULL
  AND cs.professor_id IS NOT NULL
GROUP BY p.id, p.first_name, p.last_name
ORDER BY professor_name ASC;