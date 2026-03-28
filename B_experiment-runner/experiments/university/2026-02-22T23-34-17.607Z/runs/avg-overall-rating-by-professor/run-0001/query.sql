SELECT
  p.id AS professor_id,
  p.first_name AS professor_first_name,
  p.last_name AS professor_last_name,
  ROUND(AVG(ce.overall_rating)::numeric, 2) AS avg_overall_rating
FROM public.professors p
LEFT JOIN public.course_sections cs ON cs.professor_id = p.id
LEFT JOIN public.enrollments e ON e.course_section_id = cs.id
LEFT JOIN public.course_evaluations ce ON ce.enrollment_id = e.id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY avg_overall_rating DESC NULLS LAST, p.last_name, p.first_name;