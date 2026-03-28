WITH agg AS (
  SELECT
    grade_value AS grade_value,
    AVG(exam_score) AS avg_exam,
    AVG(project_score) AS avg_project,
    AVG(attendance_score) AS avg_attendance
  FROM public.grades
  WHERE grade_value IS NOT NULL
  GROUP BY grade_value
)
SELECT
  t.grade_value AS grade_value,
  t.metric AS metric,
  t.avg_score AS avg_score
FROM (
  SELECT
    grade_value AS grade_value,
    'exam'::text AS metric,
    avg_exam AS avg_score
  FROM agg
  UNION ALL
  SELECT
    grade_value AS grade_value,
    'project'::text AS metric,
    avg_project AS avg_score
  FROM agg
  UNION ALL
  SELECT
    grade_value AS grade_value,
    'attendance'::text AS metric,
    avg_attendance AS avg_score
  FROM agg
) AS t
ORDER BY
  t.grade_value ASC,
  CASE t.metric WHEN 'exam' THEN 1 WHEN 'project' THEN 2 WHEN 'attendance' THEN 3 END