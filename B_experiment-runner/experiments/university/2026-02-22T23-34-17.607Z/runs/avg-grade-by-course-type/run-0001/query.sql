WITH per_enrollment AS (
  SELECT
    gr.id AS grade_id,
    c.course_type AS course_type,
    CASE
      WHEN ((CASE WHEN gr.exam_score IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN gr.project_score IS NOT NULL THEN 1 ELSE 0 END)
            + (CASE WHEN gr.attendance_score IS NOT NULL THEN 1 ELSE 0 END)) = 0
      THEN NULL
      ELSE (COALESCE(gr.exam_score, 0) + COALESCE(gr.project_score, 0) + COALESCE(gr.attendance_score, 0))::numeric
           / ((CASE WHEN gr.exam_score IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN gr.project_score IS NOT NULL THEN 1 ELSE 0 END)
              + (CASE WHEN gr.attendance_score IS NOT NULL THEN 1 ELSE 0 END))
    END AS per_row_avg
  FROM public.grades gr
  JOIN public.enrollments e ON gr.enrollment_id = e.id
  JOIN public.course_sections cs ON e.course_section_id = cs.id
  JOIN public.courses c ON cs.course_id = c.id
)
SELECT
  course_type AS course_type,
  ROUND(AVG(per_row_avg)::numeric, 2) AS average_grade
FROM per_enrollment
GROUP BY course_type
ORDER BY course_type;