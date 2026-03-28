WITH title_counts AS (
  SELECT
    COALESCE(academic_title, 'Unknown') AS academic_title,
    COUNT(*) AS count
  FROM professors
  GROUP BY COALESCE(academic_title, 'Unknown')
)
SELECT
  academic_title AS academic_title,
  count AS count,
  ROUND(100.0 * count / SUM(count) OVER (), 1) AS percentage
FROM title_counts
ORDER BY count DESC;