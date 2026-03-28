WITH dept_credit_counts AS (
  SELECT
    d.id AS department_id,
    d.code AS department_code,
    d.name AS department_name,
    c.credits AS credits,
    COUNT(*) AS course_count
  FROM public.departments d
  JOIN public.courses c ON c.department_id = d.id
  GROUP BY d.id, d.code, d.name, c.credits
)
SELECT
  department_id,
  department_code,
  department_name,
  credits,
  course_count,
  ROUND(100.0 * course_count::numeric / SUM(course_count) OVER (PARTITION BY department_id), 2) AS percent_of_department
FROM dept_credit_counts
ORDER BY department_code, credits;