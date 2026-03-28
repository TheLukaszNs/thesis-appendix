WITH avg_w AS (
  SELECT
    c.id AS course_id,
    c.code AS course_code,
    c.name AS course_name,
    ROUND(AVG(ce.workload_hours)::numeric, 2) AS average_workload_hours,
    COUNT(ce.workload_hours) AS evaluations_count
  FROM public.course_evaluations ce
  JOIN public.enrollments e ON ce.enrollment_id = e.id
  JOIN public.course_sections cs ON e.course_section_id = cs.id
  JOIN public.courses c ON cs.course_id = c.id
  WHERE ce.workload_hours IS NOT NULL
  GROUP BY c.id, c.code, c.name
)
SELECT
  course_id,
  course_code,
  course_name,
  average_workload_hours,
  evaluations_count
FROM avg_w
ORDER BY average_workload_hours DESC, course_code ASC, course_name ASC
LIMIT 10;