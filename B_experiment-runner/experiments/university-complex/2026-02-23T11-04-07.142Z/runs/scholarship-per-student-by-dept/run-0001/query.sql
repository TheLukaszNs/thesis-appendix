WITH student_totals AS (
  SELECT
    student_id,
    SUM(amount) AS total_amount
  FROM public.scholarships
  GROUP BY student_id
)
SELECT
  d.id AS department_id,
  d.name AS department_name,
  AVG(COALESCE(st.total_amount, 0))::numeric AS avg_scholarship_amount_per_student,
  SUM(COALESCE(st.total_amount, 0))::numeric AS total_scholarship_amount,
  COUNT(s.id) AS student_count
FROM public.departments d
JOIN public.students s ON s.department_id = d.id
LEFT JOIN student_totals st ON st.student_id = s.id
GROUP BY d.id, d.name
ORDER BY d.name ASC;