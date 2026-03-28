SELECT
  cs.academic_year AS academic_year,
  d.name AS department_name,
  SUM(CASE WHEN e.is_active = true THEN 1 ELSE 0 END) AS enrollment_count
FROM public.enrollments e
JOIN public.course_sections cs ON e.course_section_id = cs.id
JOIN public.courses c ON cs.course_id = c.id
JOIN public.departments d ON c.department_id = d.id
WHERE cs.academic_year IS NOT NULL
  AND e.is_active = true
GROUP BY cs.academic_year, d.name
ORDER BY cs.academic_year ASC, d.name ASC;