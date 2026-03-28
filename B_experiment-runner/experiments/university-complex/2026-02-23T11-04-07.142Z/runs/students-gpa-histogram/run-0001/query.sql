WITH histogram AS (
  SELECT
    width_bucket(gpa, 0, 4, 20) AS gpa_bucket,
    ((width_bucket(gpa, 0, 4, 20) - 1) * (4.0 / 20)) AS gpa_bin_start
  FROM public.students
  WHERE gpa IS NOT NULL
    AND gpa >= 0
    AND gpa <= 4
)
SELECT
  h.gpa_bin_start AS gpa_bin_start,
  COUNT(*) AS student_count
FROM histogram h
GROUP BY h.gpa_bucket, h.gpa_bin_start
ORDER BY h.gpa_bin_start;