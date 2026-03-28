SELECT
  c.course_type::text AS course_type,
  cs.semester_type::text AS semester,
  ROUND(AVG(g.exam_score)::numeric, 2) AS avg_exam_score,
  ROUND(AVG(
    (COALESCE(g.exam_score, 0) + COALESCE(g.project_score, 0) + COALESCE(g.attendance_score, 0)) /
    NULLIF(
      (CASE WHEN g.exam_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN g.project_score IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN g.attendance_score IS NOT NULL THEN 1 ELSE 0 END)
    , 0)
  )::numeric, 2) AS avg_component_average,
  COUNT(g.id) AS num_grades
FROM public.grades g
JOIN public.enrollments e ON g.enrollment_id = e.id
JOIN public.course_sections cs ON e.course_section_id = cs.id
JOIN public.courses c ON cs.course_id = c.id
WHERE lower(cs.semester_type::text) IN ('winter', 'summer')
GROUP BY c.course_type::text, cs.semester_type::text
ORDER BY c.course_type::text ASC, cs.semester_type::text ASC;