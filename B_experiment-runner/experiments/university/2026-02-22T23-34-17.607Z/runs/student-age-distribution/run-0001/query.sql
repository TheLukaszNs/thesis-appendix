WITH totals AS (
  SELECT COUNT(*) AS total_all
  FROM public.students
),
age_known AS (
  SELECT
    DATE_PART('year', AGE(CURRENT_DATE, date_of_birth))::int AS age_years,
    COUNT(*) AS student_count
  FROM public.students
  WHERE date_of_birth IS NOT NULL
    AND date_of_birth <= CURRENT_DATE
  GROUP BY age_years
),
age_unknown AS (
  SELECT NULL::int AS age_years, COUNT(*) AS student_count
  FROM public.students
  WHERE date_of_birth IS NULL OR date_of_birth > CURRENT_DATE
),
combined AS (
  SELECT age_years, student_count FROM age_known
  UNION ALL
  SELECT age_years, student_count FROM age_unknown
)
SELECT
  CASE WHEN c.age_years IS NULL THEN 'Unknown' ELSE c.age_years::text END AS age_label,
  c.age_years AS age_years,
  c.student_count AS student_count,
  ROUND((c.student_count::numeric / t.total_all) * 100.0, 2) AS percentage
FROM combined c
CROSS JOIN totals t
ORDER BY CASE WHEN c.age_years IS NULL THEN 999 ELSE c.age_years END ASC;