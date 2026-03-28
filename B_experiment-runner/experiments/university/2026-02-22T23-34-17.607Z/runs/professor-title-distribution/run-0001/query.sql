WITH title_counts AS (
  SELECT COALESCE(academic_title, 'Unknown') AS academic_title,
         COUNT(*) AS professor_count
  FROM public.professors
  GROUP BY COALESCE(academic_title, 'Unknown')
)
SELECT
  academic_title,
  professor_count,
  ROUND(100.0 * professor_count / SUM(professor_count) OVER (), 2) AS percentage
FROM title_counts
ORDER BY professor_count DESC, academic_title ASC;