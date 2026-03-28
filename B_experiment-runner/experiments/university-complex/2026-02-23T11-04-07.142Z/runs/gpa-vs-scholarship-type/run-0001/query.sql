WITH per_student_type AS (
  SELECT
    s.student_id,
    s.scholarship_type::text AS scholarship_type,
    MAX(st.gpa) AS gpa
  FROM public.scholarships s
  JOIN public.students st ON s.student_id = st.id
  WHERE st.gpa IS NOT NULL
  GROUP BY s.student_id, s.scholarship_type
)
SELECT
  scholarship_type AS scholarship_type,
  AVG(gpa) AS avg_gpa,
  COUNT(student_id) AS student_count
FROM per_student_type
GROUP BY scholarship_type
ORDER BY scholarship_type;