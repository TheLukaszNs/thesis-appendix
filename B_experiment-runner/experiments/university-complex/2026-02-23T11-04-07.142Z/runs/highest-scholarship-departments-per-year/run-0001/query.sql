WITH dept_total AS (
  SELECT
    sch.academic_year AS academic_year,
    d.name AS department_name,
    SUM(sch.amount) AS total_scholarship_amount
  FROM public.scholarships AS sch
  JOIN public.students AS stu ON sch.student_id = stu.id
  JOIN public.departments AS d ON stu.department_id = d.id
  WHERE sch.amount IS NOT NULL
  GROUP BY sch.academic_year, d.name
)
SELECT
  academic_year,
  department_name,
  total_scholarship_amount
FROM (
  SELECT
    academic_year,
    department_name,
    total_scholarship_amount,
    RANK() OVER (PARTITION BY academic_year ORDER BY total_scholarship_amount DESC) AS dept_rank
  FROM dept_total
) AS ranked
WHERE dept_rank = 1
ORDER BY academic_year ASC, department_name ASC;