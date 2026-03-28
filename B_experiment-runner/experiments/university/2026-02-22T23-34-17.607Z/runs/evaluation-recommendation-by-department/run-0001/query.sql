WITH student_recommend AS (
  SELECT
    d.id AS department_id,
    d.name AS department_name,
    e.student_id AS student_id,
    MAX(CASE WHEN ce.would_recommend THEN 1 ELSE 0 END) AS any_recommend
  FROM public.course_evaluations ce
  JOIN public.enrollments e ON ce.enrollment_id = e.id
  JOIN public.course_sections cs ON e.course_section_id = cs.id
  JOIN public.courses c ON cs.course_id = c.id
  JOIN public.departments d ON c.department_id = d.id
  GROUP BY d.id, d.name, e.student_id
)
SELECT
  sr.department_id AS department_id,
  sr.department_name AS department_name,
  ROUND(100.0 * SUM(sr.any_recommend)::numeric / NULLIF(COUNT(*) , 0), 2) AS recommend_pct
FROM student_recommend sr
GROUP BY sr.department_id, sr.department_name
ORDER BY recommend_pct DESC, sr.department_name;