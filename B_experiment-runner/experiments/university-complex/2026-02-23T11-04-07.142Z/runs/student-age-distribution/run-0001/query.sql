WITH computed AS (
  SELECT
    sub.id AS id,
    sub.age AS age,
    CASE
      WHEN sub.age < 18 THEN '<18'
      WHEN sub.age BETWEEN 18 AND 20 THEN '18-20'
      WHEN sub.age BETWEEN 21 AND 24 THEN '21-24'
      WHEN sub.age BETWEEN 25 AND 29 THEN '25-29'
      WHEN sub.age BETWEEN 30 AND 39 THEN '30-39'
      ELSE '40+'
    END AS age_group
  FROM (
    SELECT s.id, EXTRACT(year FROM age(current_date, s.date_of_birth))::int AS age
    FROM public.students s
    WHERE s.date_of_birth IS NOT NULL
  ) sub
)
SELECT
  c.age_group AS age_group,
  c.age AS age,
  COUNT(c.id) AS student_count
FROM computed c
GROUP BY c.age_group, c.age
ORDER BY
  CASE c.age_group
    WHEN '<18' THEN 1
    WHEN '18-20' THEN 2
    WHEN '21-24' THEN 3
    WHEN '25-29' THEN 4
    WHEN '30-39' THEN 5
    ELSE 6
  END,
  c.age;