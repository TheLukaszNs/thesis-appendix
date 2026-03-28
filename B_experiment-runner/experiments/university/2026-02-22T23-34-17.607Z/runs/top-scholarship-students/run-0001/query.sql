WITH totals AS (
  SELECT
    s.id AS student_id,
    s.first_name AS first_name,
    s.last_name AS last_name,
    SUM(sc.amount) AS total_amount
  FROM public.students s
  JOIN public.scholarships sc ON sc.student_id = s.id
  GROUP BY s.id, s.first_name, s.last_name
)
SELECT
  t.student_id AS student_id,
  t.first_name AS first_name,
  t.last_name AS last_name,
  t.total_amount AS total_amount
FROM totals t
WHERE t.total_amount = (SELECT MAX(total_amount) FROM totals)
ORDER BY t.student_id;
