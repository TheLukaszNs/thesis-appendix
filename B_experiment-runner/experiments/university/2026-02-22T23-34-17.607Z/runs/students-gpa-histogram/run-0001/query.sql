WITH hist AS (
  SELECT
    width_bucket(gpa, 0.0, 4.0, 8) AS bin_index,
    count(*) AS student_count,
    min(gpa) AS min_gpa_in_bin,
    max(gpa) AS max_gpa_in_bin
  FROM public.students
  WHERE gpa IS NOT NULL
  GROUP BY width_bucket(gpa, 0.0, 4.0, 8)
)
SELECT
  CASE
    WHEN bin_index = 0 THEN 'below 0.00' 
    WHEN bin_index > 8 THEN '>= 4.00'
    ELSE to_char(((bin_index - 1) * (4.0 / 8)), 'FM9.00') || ' - ' || to_char((bin_index * (4.0 / 8)), 'FM9.00')
  END AS gpa_bin,
  student_count AS student_count,
  COALESCE(to_char(min_gpa_in_bin, 'FM9.00'), '') AS min_gpa,
  COALESCE(to_char(max_gpa_in_bin, 'FM9.00'), '') AS max_gpa
FROM hist
ORDER BY CASE WHEN bin_index = 0 THEN 0 WHEN bin_index > 8 THEN 9 ELSE bin_index END;