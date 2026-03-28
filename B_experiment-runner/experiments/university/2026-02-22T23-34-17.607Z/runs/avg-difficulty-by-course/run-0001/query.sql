WITH evaluation_pairs AS (
  SELECT
    cs.course_id,
    ce.difficulty_rating
  FROM public.course_evaluations ce
  JOIN public.enrollments e ON ce.enrollment_id = e.id
  JOIN public.course_sections cs ON e.course_section_id = cs.id
)
SELECT
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  ROUND(AVG(ep.difficulty_rating)::numeric, 2) AS average_difficulty
FROM public.courses c
LEFT JOIN evaluation_pairs ep ON ep.course_id = c.id
GROUP BY c.id, c.code, c.name
ORDER BY average_difficulty DESC NULLS LAST, c.code;