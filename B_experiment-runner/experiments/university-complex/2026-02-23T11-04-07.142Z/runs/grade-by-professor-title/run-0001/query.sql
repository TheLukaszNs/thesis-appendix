SELECT p.academic_title AS academic_title,
       AVG(g.exam_score) AS avg_exam_score,
       COUNT(g.id) AS grade_count
FROM public.grades g
JOIN public.enrollments e ON g.enrollment_id = e.id
JOIN public.course_sections cs ON e.course_section_id = cs.id
JOIN public.professors p ON cs.professor_id = p.id
WHERE p.academic_title IS NOT NULL
  AND g.exam_score IS NOT NULL
GROUP BY p.academic_title
ORDER BY avg_exam_score DESC, p.academic_title ASC;