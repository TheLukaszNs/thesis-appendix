WITH dept_scores AS (
  SELECT
    d.id AS department_id,
    d.name AS department_name,
    g.project_score AS project_score
  FROM public.grades g
  JOIN public.enrollments e ON g.enrollment_id = e.id
  JOIN public.course_sections cs ON e.course_section_id = cs.id
  JOIN public.courses c ON cs.course_id = c.id
  JOIN public.departments d ON c.department_id = d.id
  WHERE g.project_score IS NOT NULL
)
SELECT
  department_id AS department_id,
  department_name AS department_name,
  ROUND(AVG(project_score)::numeric, 2) AS avg_project_score
FROM dept_scores
GROUP BY department_id, department_name
ORDER BY avg_project_score DESC, department_name ASC;