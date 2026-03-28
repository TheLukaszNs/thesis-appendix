WITH dept_avgs AS (
  SELECT d.name AS department_name,
         AVG(g.exam_score) AS avg_exam_score,
         AVG(g.project_score) AS avg_project_score
  FROM public.grades g
  JOIN public.enrollments e ON g.enrollment_id = e.id
  JOIN public.course_sections cs ON e.course_section_id = cs.id
  JOIN public.courses c ON cs.course_id = c.id
  JOIN public.departments d ON c.department_id = d.id
  WHERE g.exam_score IS NOT NULL OR g.project_score IS NOT NULL
  GROUP BY d.name
)
SELECT department_name, 'Exam' AS metric, avg_exam_score AS avg_score
FROM dept_avgs
UNION ALL
SELECT department_name, 'Project' AS metric, avg_project_score AS avg_score
FROM dept_avgs
ORDER BY department_name ASC, metric ASC;