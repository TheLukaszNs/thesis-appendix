SELECT cs.semester_type AS semester_type, cs.academic_year AS academic_year, COUNT(e.id) AS enrollment_count
FROM public.course_sections AS cs
JOIN public.enrollments AS e
  ON e.course_section_id = cs.id
GROUP BY cs.semester_type, cs.academic_year
ORDER BY cs.academic_year DESC, cs.semester_type ASC;