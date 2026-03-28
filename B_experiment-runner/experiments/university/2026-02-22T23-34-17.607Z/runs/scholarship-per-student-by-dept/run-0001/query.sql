WITH scholarship_totals AS (
  SELECT student_id, SUM(amount) AS total_scholarship
  FROM public.scholarships
  GROUP BY student_id
)
SELECT
  d.id AS department_id,
  d.name AS department_name,
  ROUND(AVG(COALESCE(stt.total_scholarship, 0))::numeric, 2) AS avg_scholarship_amount,
  COUNT(st.id) AS student_count
FROM public.departments d
LEFT JOIN public.students st ON st.department_id = d.id
LEFT JOIN scholarship_totals stt ON stt.student_id = st.id
GROUP BY d.id, d.name
ORDER BY d.name ASC;