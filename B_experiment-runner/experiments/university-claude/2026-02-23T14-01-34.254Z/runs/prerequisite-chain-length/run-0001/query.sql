
SELECT 
  c.id,
  c.code,
  c.name,
  COUNT(p.course_id) AS num_courses_requiring_this_prerequisite
FROM courses c
INNER JOIN prerequisites p ON c.id = p.prerequisite_course_id
GROUP BY c.id, c.code, c.name
ORDER BY num_courses_requiring_this_prerequisite DESC
