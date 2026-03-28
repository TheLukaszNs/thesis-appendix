SELECT d.name AS department_name,
       AVG(g.project_score) AS avg_project_score
FROM public.grades AS g
JOIN public.enrollments AS e ON g.enrollment_id = e.id
JOIN public.course_sections AS cs ON e.course_section_id = cs.id
JOIN public.courses AS c ON cs.course_id = c.id
JOIN public.departments AS d ON c.department_id = d.id
WHERE g.project_score IS NOT NULL
  AND e.is_active = true
GROUP BY d.name
ORDER BY d.name ASC;