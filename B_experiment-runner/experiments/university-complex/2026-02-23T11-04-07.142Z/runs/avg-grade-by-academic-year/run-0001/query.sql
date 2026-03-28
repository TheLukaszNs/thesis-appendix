WITH per_row AS (
  SELECT
    CASE
      WHEN EXTRACT(MONTH FROM grade_date) >= 8 THEN (EXTRACT(YEAR FROM grade_date))::int
      ELSE (EXTRACT(YEAR FROM grade_date))::int - 1
    END AS academic_year_start,
    CASE
      WHEN EXTRACT(MONTH FROM grade_date) >= 8
      THEN CONCAT((EXTRACT(YEAR FROM grade_date))::int, '-', ((EXTRACT(YEAR FROM grade_date))::int + 1))
      ELSE CONCAT(((EXTRACT(YEAR FROM grade_date))::int - 1), '-', (EXTRACT(YEAR FROM grade_date))::int)
    END AS academic_year,
    exam_score
  FROM public.grades g
  WHERE g.exam_score IS NOT NULL
    AND g.grade_date IS NOT NULL
)
SELECT
  academic_year AS academic_year,
  AVG(exam_score) AS avg_exam_score
FROM per_row
GROUP BY academic_year_start, academic_year
ORDER BY academic_year_start ASC;