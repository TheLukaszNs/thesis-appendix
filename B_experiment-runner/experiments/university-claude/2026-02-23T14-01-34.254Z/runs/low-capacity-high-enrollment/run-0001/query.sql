
SELECT 
  c.code,
  c.name,
  cs.section_number,
  cs.academic_year,
  cs.semester_type,
  COUNT(e.id) AS enrolled_count,
  cs.max_students,
  ROUND(COUNT(e.id)::numeric / cs.max_students, 4) AS overbooked_ratio
FROM course_sections cs
JOIN courses c ON cs.course_id = c.id
LEFT JOIN enrollments e ON cs.id = e.course_section_id AND e.is_active = true
GROUP BY cs.id, c.code, c.name, cs.section_number, cs.academic_year, cs.semester_type, cs.max_students
ORDER BY overbooked_ratio DESC
