WITH evals AS (
  SELECT
    CASE
      WHEN EXTRACT(MONTH FROM submitted_at) >= 9
        THEN EXTRACT(YEAR FROM submitted_at)::int
      ELSE (EXTRACT(YEAR FROM submitted_at)::int - 1)
    END AS start_year,
    overall_rating
  FROM public.course_evaluations
)
SELECT
  (start_year || '-' || (start_year + 1))::text AS academic_year,
  ROUND(AVG(overall_rating)::numeric, 2) AS avg_overall_rating
FROM evals
GROUP BY start_year
ORDER BY start_year;