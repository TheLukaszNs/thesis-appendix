SELECT
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  ROUND(AVG(g.exam_score)::numeric, 2) AS avg_exam_score
FROM public.courses c
LEFT JOIN public.course_sections cs ON cs.course_id = c.id
LEFT JOIN public.enrollments e ON e.course_section_id = cs.id
LEFT JOIN public.grades g ON g.enrollment_id = e.id AND g.exam_score IS NOT NULL
GROUP BY c.id, c.code, c.name
ORDER BY c.code ASC;