SELECT c.credits AS credits,
       AVG((COALESCE(g.exam_score, 0) + COALESCE(g.project_score, 0) + COALESCE(g.attendance_score, 0))
           / NULLIF((CASE WHEN g.exam_score IS NOT NULL THEN 1 ELSE 0 END
                     + CASE WHEN g.project_score IS NOT NULL THEN 1 ELSE 0 END
                     + CASE WHEN g.attendance_score IS NOT NULL THEN 1 ELSE 0 END), 0))
           AS avg_grade,
       COUNT(e.id) AS n_enrollments
FROM public.courses AS c
JOIN public.course_sections AS cs ON cs.course_id = c.id
JOIN public.enrollments AS e ON e.course_section_id = cs.id
JOIN public.grades AS g ON g.enrollment_id = e.id
WHERE (g.exam_score IS NOT NULL OR g.project_score IS NOT NULL OR g.attendance_score IS NOT NULL)
GROUP BY c.credits
ORDER BY c.credits ASC;