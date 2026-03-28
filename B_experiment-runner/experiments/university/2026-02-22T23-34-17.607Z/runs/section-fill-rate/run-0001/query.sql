WITH section_enrollments AS (
  SELECT
    cs.id AS section_id,
    cs.max_students AS max_students,
    COUNT(e.id) FILTER (WHERE e.is_active) AS enrolled_count
  FROM public.course_sections cs
  LEFT JOIN public.enrollments e
    ON e.course_section_id = cs.id
  GROUP BY cs.id, cs.max_students
)
SELECT
  AVG(se.enrolled_count::numeric / se.max_students) AS avg_fill_rate
FROM section_enrollments se
WHERE se.max_students > 0;