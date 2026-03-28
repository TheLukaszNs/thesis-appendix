WITH professor_grades AS (
  SELECT
    p.id AS professor_id,
    CONCAT(p.first_name, ' ', p.last_name) AS professor_name,
    AVG(g.exam_score) AS avg_grade,
    COUNT(g.id) AS num_grades
  FROM public.grades g
  JOIN public.enrollments e ON g.enrollment_id = e.id
  JOIN public.course_sections cs ON e.course_section_id = cs.id
  JOIN public.professors p ON cs.professor_id = p.id
  WHERE g.exam_score IS NOT NULL
    AND cs.professor_id IS NOT NULL
  GROUP BY p.id, p.first_name, p.last_name
)
SELECT
  professor_id,
  professor_name,
  avg_grade,
  num_grades
FROM professor_grades
ORDER BY avg_grade ASC, professor_name ASC;