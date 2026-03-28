SELECT c.course_type AS course_type,
       AVG((COALESCE(g.exam_score, 0) + COALESCE(g.project_score, 0) + COALESCE(g.attendance_score, 0)) / NULLIF((CASE WHEN g.exam_score IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN g.project_score IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN g.attendance_score IS NOT NULL THEN 1 ELSE 0 END), 0)) AS average_grade
FROM public.grades g
JOIN public.enrollments e ON g.enrollment_id = e.id
JOIN public.course_sections cs ON e.course_section_id = cs.id
JOIN public.courses c ON cs.course_id = c.id
WHERE (g.exam_score IS NOT NULL OR g.project_score IS NOT NULL OR g.attendance_score IS NOT NULL)
GROUP BY c.course_type
ORDER BY c.course_type;