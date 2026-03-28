SELECT
  academic_year AS academic_year,
  semester_type AS semester_type,
  COUNT(*) AS section_count
FROM public.course_sections
GROUP BY academic_year, semester_type
ORDER BY academic_year ASC, semester_type ASC;