WITH enrolled AS (
  SELECT
    e.course_section_id AS course_section_id,
    COUNT(*) FILTER (WHERE e.is_active = true) AS enrolled_count
  FROM public.enrollments e
  GROUP BY e.course_section_id
)
SELECT
  cs.id AS section_id,
  cs.course_id AS course_id,
  cs.academic_year AS academic_year,
  cs.semester_type AS semester_type,
  cs.section_number AS section_number,
  cs.max_students AS max_students,
  COALESCE(en.enrolled_count, 0) AS enrolled_count,
  CASE
    WHEN cs.max_students = 0 AND COALESCE(en.enrolled_count, 0) > 0 THEN 1e9
    WHEN cs.max_students = 0 THEN NULL
    ELSE COALESCE(en.enrolled_count, 0)::numeric / cs.max_students
  END AS overbooked_ratio
FROM public.course_sections cs
LEFT JOIN enrolled en ON cs.id = en.course_section_id
ORDER BY overbooked_ratio DESC NULLS LAST, enrolled_count DESC, cs.id
LIMIT 10;