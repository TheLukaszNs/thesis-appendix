SELECT
  COALESCE(p.academic_title, 'Unknown') AS academic_title,
  COUNT(g.id) AS grade_count,
  ROUND(AVG(g.exam_score)::numeric, 2) AS avg_exam_score,
  ROUND(AVG(g.project_score)::numeric, 2) AS avg_project_score,
  ROUND(AVG(g.attendance_score)::numeric, 2) AS avg_attendance_score,
  ROUND(
    AVG(
      CASE
        WHEN (
          (CASE WHEN g.exam_score IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN g.project_score IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN g.attendance_score IS NOT NULL THEN 1 ELSE 0 END)
        ) > 0
        THEN (
          COALESCE(g.exam_score, 0) + COALESCE(g.project_score, 0) + COALESCE(g.attendance_score, 0)
        )::numeric / NULLIF(
          (CASE WHEN g.exam_score IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN g.project_score IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN g.attendance_score IS NOT NULL THEN 1 ELSE 0 END), 0
        )
        ELSE NULL
      END
    )::numeric, 2
  ) AS avg_overall_score
FROM public.professors p
JOIN public.course_sections cs ON cs.professor_id = p.id
JOIN public.enrollments e ON e.course_section_id = cs.id
JOIN public.grades g ON g.enrollment_id = e.id
GROUP BY COALESCE(p.academic_title, 'Unknown')
ORDER BY avg_overall_score DESC NULLS LAST