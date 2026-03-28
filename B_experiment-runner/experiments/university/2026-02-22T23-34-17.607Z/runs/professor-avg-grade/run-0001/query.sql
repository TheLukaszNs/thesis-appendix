WITH professor_grades AS (
  SELECT
    p.id AS professor_id,
    p.first_name AS first_name,
    p.last_name AS last_name,
    g.exam_score AS exam_score
  FROM public.professors p
  JOIN public.course_sections cs ON cs.professor_id = p.id
  JOIN public.enrollments e ON e.course_section_id = cs.id
  JOIN public.grades g ON g.enrollment_id = e.id
)
SELECT
  professor_id,
  first_name,
  last_name,
  ROUND(AVG(exam_score)::numeric, 2) AS average_grade,
  COUNT(exam_score) AS grade_count
FROM professor_grades
WHERE exam_score IS NOT NULL
GROUP BY professor_id, first_name, last_name
ORDER BY last_name, first_name;