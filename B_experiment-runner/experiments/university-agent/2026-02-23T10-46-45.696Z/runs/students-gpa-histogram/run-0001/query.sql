WITH binned AS (
  SELECT FLOOR(gpa * 4) / 4.0 AS bin_start
  FROM students
  WHERE gpa IS NOT NULL
)
SELECT
  bin_start AS bin_start,
  (bin_start + 0.25) AS bin_end,
  COUNT(*) AS count
FROM binned
GROUP BY bin_start
ORDER BY bin_start;