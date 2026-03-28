WITH course_enroll_counts AS (
  SELECT
    c.id AS course_id,
    c.code AS course_code,
    c.name AS course_name,
    COUNT(DISTINCT e.student_id) AS total_enrollments
  FROM public.courses AS c
  JOIN public.course_sections AS cs ON cs.course_id = c.id
  JOIN public.enrollments AS e ON e.course_section_id = cs.id
  WHERE e.is_active = true
  GROUP BY c.id, c.code, c.name
)
SELECT
  course_id,
  course_code,
  course_name,
  total_enrollments
FROM course_enroll_counts
ORDER BY total_enrollments DESC, course_code ASC
LIMIT 15;