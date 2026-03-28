WITH dept_scores AS (
  SELECT
    d.id AS department_id,
    d.name AS department_name,
    AVG(gr.exam_score) FILTER (WHERE gr.exam_score IS NOT NULL) AS avg_exam_score,
    AVG(gr.project_score) FILTER (WHERE gr.project_score IS NOT NULL) AS avg_project_score,
    COUNT(gr.id) FILTER (WHERE gr.exam_score IS NOT NULL OR gr.project_score IS NOT NULL) AS score_count
  FROM public.grades gr
  JOIN public.enrollments e ON e.id = gr.enrollment_id
  JOIN public.course_sections cs ON cs.id = e.course_section_id
  JOIN public.courses c ON c.id = cs.course_id
  JOIN public.departments d ON d.id = c.department_id
  GROUP BY d.id, d.name
)
SELECT
  department_id,
  department_name,
  ROUND(avg_exam_score::numeric, 2) AS avg_exam_score,
  ROUND(avg_project_score::numeric, 2) AS avg_project_score,
  ROUND((avg_exam_score - avg_project_score)::numeric, 2) AS exam_minus_project_diff,
  CASE
    WHEN avg_exam_score IS NULL AND avg_project_score IS NULL THEN 'no_scores'
    WHEN avg_exam_score > avg_project_score THEN 'exam_higher'
    WHEN avg_exam_score < avg_project_score THEN 'project_higher'
    ELSE 'equal'
  END AS exam_vs_project,
  score_count
FROM dept_scores
ORDER BY department_name ASC;