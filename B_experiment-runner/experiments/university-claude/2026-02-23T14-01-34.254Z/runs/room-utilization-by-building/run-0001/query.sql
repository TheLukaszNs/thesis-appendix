SELECT 
  c.building,
  COUNT(cs.id) AS section_count
FROM course_sections cs
JOIN classrooms c ON cs.classroom_id = c.id
GROUP BY c.building
ORDER BY c.building;