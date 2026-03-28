
SELECT 
  ROUND(AVG(CAST(enrolled_count AS NUMERIC) / cs.max_students), 4) AS average_fill_rate
FROM course_sections cs
LEFT JOIN (
  SELECT 
    course_section_id,
    COUNT(*) AS enrolled_count
  FROM enrollments
  WHERE is_active = true
  GROUP BY course_section_id
) e ON cs.id = e.course_section_id
WHERE cs.max_students > 0
