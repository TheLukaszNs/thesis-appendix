SELECT
  cs.academic_year AS academic_year,
  AVG(ce.professor_rating)::numeric(5,2) AS avg_professor_rating,
  COUNT(ce.id) AS eval_count
FROM public.course_evaluations AS ce
JOIN public.enrollments AS e ON ce.enrollment_id = e.id
JOIN public.course_sections AS cs ON e.course_section_id = cs.id
WHERE ce.professor_rating IS NOT NULL
  AND cs.academic_year IS NOT NULL
GROUP BY cs.academic_year
ORDER BY
  (CASE WHEN cs.academic_year ~ '^[0-9]{4}' THEN substring(cs.academic_year from '^[0-9]{4}')::int ELSE NULL END) ASC NULLS LAST,
  cs.academic_year ASC;