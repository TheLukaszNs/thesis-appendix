
SELECT 
  d.name AS department_name,
  ROUND(AVG(section_count), 2) AS avg_sections_per_professor
FROM (
  SELECT 
    p.id,
    p.department_id,
    COUNT(cs.id) AS section_count
  FROM professors p
  LEFT JOIN course_sections cs ON p.id = cs.professor_id
  GROUP BY p.id, p.department_id
) prof_sections
JOIN departments d ON prof_sections.department_id = d.id
GROUP BY d.id, d.name
ORDER BY d.name
