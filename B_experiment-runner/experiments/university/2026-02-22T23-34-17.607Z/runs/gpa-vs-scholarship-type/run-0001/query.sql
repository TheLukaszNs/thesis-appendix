WITH recipients AS (
  SELECT
    scholarship_type AS scholarship_type,
    student_id AS student_id
  FROM public.scholarships
  GROUP BY scholarship_type, student_id
)
SELECT
  r.scholarship_type AS scholarship_type,
  ROUND(AVG(st.gpa)::numeric, 2) AS avg_gpa
FROM recipients r
JOIN public.students st
  ON st.id = r.student_id
WHERE st.gpa IS NOT NULL
GROUP BY r.scholarship_type
ORDER BY r.scholarship_type;