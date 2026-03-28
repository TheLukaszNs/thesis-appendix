WITH per_prof AS (
  SELECT
    p.id AS professor_id,
    p.first_name || ' ' || p.last_name AS professor_name,
    AVG(ce.content_rating)::numeric(10,2) AS avg_content_rating,
    AVG(ce.professor_rating)::numeric(10,2) AS avg_prof_rating,
    COUNT(ce.id) AS num_evaluations
  FROM public.course_evaluations ce
  JOIN public.enrollments e ON ce.enrollment_id = e.id
  JOIN public.course_sections cs ON e.course_section_id = cs.id
  JOIN public.professors p ON cs.professor_id = p.id
  WHERE ce.content_rating IS NOT NULL
    AND ce.professor_rating IS NOT NULL
  GROUP BY p.id, p.first_name, p.last_name
  ORDER BY p.last_name, p.first_name
)
SELECT professor_id, professor_name, avg_content_rating, avg_prof_rating, num_evaluations
FROM per_prof;