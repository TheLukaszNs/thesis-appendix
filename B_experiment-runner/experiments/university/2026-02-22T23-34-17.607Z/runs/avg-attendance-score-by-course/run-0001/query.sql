SELECT
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  ROUND(AVG(g.attendance_score)::numeric, 2) AS avg_attendance_score
FROM public.courses c
JOIN public.course_sections cs ON cs.course_id = c.id
JOIN public.enrollments e ON e.course_section_id = cs.id
JOIN public.grades g ON g.enrollment_id = e.id
GROUP BY c.id, c.code, c.name
ORDER BY c.code;