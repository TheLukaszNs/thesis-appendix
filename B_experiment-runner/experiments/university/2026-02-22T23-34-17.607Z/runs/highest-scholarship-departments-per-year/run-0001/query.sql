WITH totals AS (
  SELECT
    sch.academic_year AS academic_year,
    d.id AS department_id,
    d.name AS department_name,
    SUM(sch.amount) AS total_amount
  FROM public.scholarships sch
  JOIN public.students stu ON sch.student_id = stu.id
  JOIN public.departments d ON stu.department_id = d.id
  GROUP BY sch.academic_year, d.id, d.name
),
ranked AS (
  SELECT
    academic_year,
    department_id,
    department_name,
    total_amount,
    ROW_NUMBER() OVER (PARTITION BY academic_year ORDER BY total_amount DESC, department_name ASC) AS rn
  FROM totals
)
SELECT
  academic_year,
  department_id,
  department_name,
  total_amount
FROM ranked
WHERE rn = 1
ORDER BY academic_year ASC;