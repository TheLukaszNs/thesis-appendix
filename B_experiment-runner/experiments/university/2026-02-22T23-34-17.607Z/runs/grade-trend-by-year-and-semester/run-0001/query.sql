WITH grade_values AS (
  SELECT
    cs.academic_year AS academic_year,
    cs.semester_type AS semester_type,
    CASE
      WHEN g.exam_score IS NOT NULL OR g.project_score IS NOT NULL OR g.attendance_score IS NOT NULL THEN
        (COALESCE(g.exam_score,0) + COALESCE(g.project_score,0) + COALESCE(g.attendance_score,0))::numeric
        / NULLIF(
            (CASE WHEN g.exam_score IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN g.project_score IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN g.attendance_score IS NOT NULL THEN 1 ELSE 0 END)
          ,0)
      WHEN g.grade_value IS NOT NULL THEN
        NULLIF(REGEXP_REPLACE(g.grade_value::text, '[^0-9\.]', '', 'g'), '')::numeric
      ELSE NULL
    END AS grade_numeric
  FROM public.grades g
  JOIN public.enrollments e ON e.id = g.enrollment_id
  JOIN public.course_sections cs ON cs.id = e.course_section_id
)
SELECT
  academic_year AS academic_year,
  semester_type AS semester_type,
  ROUND(AVG(grade_numeric)::numeric, 2) AS average_grade,
  COUNT(grade_numeric) AS grade_count
FROM grade_values
WHERE grade_numeric IS NOT NULL
GROUP BY academic_year, semester_type
ORDER BY
  NULLIF(substring(academic_year FROM '^\d{4}'), '')::int NULLS LAST,
  semester_type;