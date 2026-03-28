WITH numeric_grades AS (
  SELECT
    g.id AS grade_id,
    e.course_section_id AS course_section_id,
    CAST(g.grade_value::text AS numeric) AS numeric_grade
  FROM public.grades g
  JOIN public.enrollments e ON e.id = g.enrollment_id
  WHERE g.grade_value IS NOT NULL
    AND g.grade_value::text ~ '^[0-9]+(\.[0-9]+)?$'
)
SELECT
  p.id AS professor_id,
  (p.last_name || ', ' || p.first_name) AS professor_name,
  ROUND(AVG(ng.numeric_grade)::numeric, 2) AS average_grade,
  COUNT(ng.numeric_grade) AS num_grades
FROM numeric_grades ng
JOIN public.course_sections cs ON cs.id = ng.course_section_id
JOIN public.professors p ON p.id = cs.professor_id
GROUP BY p.id, p.first_name, p.last_name
HAVING COUNT(ng.numeric_grade) > 0
ORDER BY average_grade ASC, num_grades DESC, p.last_name, p.first_name;