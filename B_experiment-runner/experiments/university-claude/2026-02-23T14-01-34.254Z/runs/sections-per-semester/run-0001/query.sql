SELECT 
  cs.academic_year,
  cs.semester_type,
  COUNT(cs.id) AS section_count
FROM course_sections cs
GROUP BY cs.academic_year, cs.semester_type
ORDER BY cs.academic_year, cs.semester_type