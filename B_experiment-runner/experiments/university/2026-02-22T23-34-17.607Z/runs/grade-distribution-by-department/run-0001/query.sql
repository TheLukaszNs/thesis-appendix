WITH dept_grades AS (
  SELECT
    d.id AS department_id,
    d.name AS department_name,
    g.grade_value::text AS grade_value,
    COUNT(g.id) AS grade_count
  FROM public.departments d
  JOIN public.courses c ON c.department_id = d.id
  JOIN public.course_sections cs ON cs.course_id = c.id
  JOIN public.enrollments e ON e.course_section_id = cs.id
  JOIN public.grades g ON g.enrollment_id = e.id
  WHERE g.grade_value IS NOT NULL
  GROUP BY d.id, d.name, g.grade_value::text
)
SELECT
  department_id,
  department_name,
  grade_value,
  grade_count,
  ROUND((grade_count::numeric / SUM(grade_count) OVER (PARTITION BY department_id)) * 100, 2) AS pct_of_department
FROM dept_grades
ORDER BY department_name, grade_value NULLS LAST;