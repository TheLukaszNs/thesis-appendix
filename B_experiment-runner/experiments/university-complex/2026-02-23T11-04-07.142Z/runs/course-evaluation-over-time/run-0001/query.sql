WITH ev AS (
  SELECT
    submitted_at,
    overall_rating,
    CASE
      WHEN EXTRACT(MONTH FROM submitted_at) >= 8
      THEN (EXTRACT(YEAR FROM submitted_at)::int)::text || '-' || (EXTRACT(YEAR FROM submitted_at)::int + 1)::text
      ELSE ((EXTRACT(YEAR FROM submitted_at)::int - 1)::text || '-' || (EXTRACT(YEAR FROM submitted_at)::int)::text)
    END AS academic_year,
    CASE
      WHEN EXTRACT(MONTH FROM submitted_at) >= 8
      THEN EXTRACT(YEAR FROM submitted_at)::int
      ELSE (EXTRACT(YEAR FROM submitted_at)::int - 1)
    END AS start_year
  FROM public.course_evaluations
  WHERE overall_rating IS NOT NULL
    AND submitted_at IS NOT NULL
)
SELECT
  academic_year AS academic_year,
  ROUND(AVG(overall_rating)::numeric, 2) AS avg_overall_rating
FROM ev
GROUP BY academic_year, start_year
ORDER BY start_year ASC;