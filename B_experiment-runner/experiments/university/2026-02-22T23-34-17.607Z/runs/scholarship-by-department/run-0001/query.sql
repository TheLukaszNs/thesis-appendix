WITH dept_totals AS (
  SELECT
    d.id AS dept_id,
    d.code AS dept_code,
    d.name AS dept_name,
    SUM(sch.amount) AS total_amount,
    COUNT(sch.id) AS scholarship_count,
    COUNT(DISTINCT sch.student_id) AS student_count
  FROM public.departments d
  JOIN public.students st ON st.department_id = d.id
  JOIN public.scholarships sch ON sch.student_id = st.id
  GROUP BY d.id, d.code, d.name
)
SELECT
  dept_id,
  dept_code,
  dept_name,
  total_amount,
  scholarship_count,
  student_count
FROM dept_totals
ORDER BY total_amount DESC, dept_name ASC;