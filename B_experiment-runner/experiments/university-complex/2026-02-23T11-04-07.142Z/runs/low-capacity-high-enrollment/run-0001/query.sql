WITH section_agg AS (
  SELECT
    cs.id AS section_id,
    cs.course_id::text || '-' || cs.section_number::text || ' ' || cs.semester_type::text || ' ' || cs.academic_year AS section_label,
    COUNT(e.id) FILTER (WHERE e.is_active) AS enrolled_count,
    cs.max_students AS max_students
  FROM public.course_sections cs
  LEFT JOIN public.enrollments e
    ON e.course_section_id = cs.id
  GROUP BY cs.id, cs.course_id, cs.section_number, cs.semester_type, cs.academic_year, cs.max_students
)
SELECT
  section_id,
  section_label,
  enrolled_count,
  max_students,
  enrolled_count::double precision / NULLIF(max_students, 0) AS overbooked_ratio
FROM section_agg
WHERE max_students IS NOT NULL AND max_students <> 0
ORDER BY overbooked_ratio DESC, section_id;