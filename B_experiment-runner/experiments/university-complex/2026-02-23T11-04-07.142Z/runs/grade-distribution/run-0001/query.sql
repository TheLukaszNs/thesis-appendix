SELECT g.grade_value AS final_grade,
       COUNT(g.id) AS grade_count
FROM public.grades AS g
JOIN public.enrollments AS e ON e.id = g.enrollment_id
JOIN public.course_sections AS cs ON cs.id = e.course_section_id
WHERE g.grade_value IS NOT NULL
GROUP BY g.grade_value
ORDER BY g.grade_value ASC;