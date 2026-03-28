SELECT
  c.code AS course_code,
  c.name AS course_name,
  AVG(g.exam_score) AS average_exam_score
FROM public.grades g
JOIN public.enrollments e ON g.enrollment_id = e.id
JOIN public.course_sections cs ON e.course_section_id = cs.id
JOIN public.courses c ON cs.course_id = c.id
WHERE g.exam_score IS NOT NULL
GROUP BY c.id, c.code, c.name
ORDER BY c.name ASC;