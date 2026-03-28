WITH evals AS (
  SELECT
    c.id AS course_id,
    c.code AS course_code,
    c.name AS course_name,
    SUM(CASE WHEN ce.would_recommend THEN 1 ELSE 0 END) AS recommend_count,
    COUNT(*) AS eval_count
  FROM public.course_evaluations ce
  JOIN public.enrollments e ON e.id = ce.enrollment_id
  JOIN public.course_sections cs ON cs.id = e.course_section_id
  JOIN public.courses c ON c.id = cs.course_id
  GROUP BY c.id, c.code, c.name
)
SELECT
  course_id,
  course_code,
  course_name,
  ROUND((recommend_count::numeric / eval_count::numeric) * 100, 2) AS recommend_pct
FROM evals
ORDER BY recommend_pct DESC, course_code ASC;