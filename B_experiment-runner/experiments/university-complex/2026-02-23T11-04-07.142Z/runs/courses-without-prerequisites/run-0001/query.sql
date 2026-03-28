WITH course_pr_counts AS (
  SELECT
    c.id AS course_id,
    COUNT(pr.id) AS prereq_count
  FROM public.courses AS c
  LEFT JOIN public.prerequisites AS pr
    ON pr.course_id = c.id
  GROUP BY c.id
)
SELECT
  CASE WHEN cpc.prereq_count = 0 THEN 'no_prerequisites' ELSE 'at_least_one' END AS prereq_category,
  COUNT(cpc.course_id) AS course_count
FROM course_pr_counts AS cpc
GROUP BY CASE WHEN cpc.prereq_count = 0 THEN 'no_prerequisites' ELSE 'at_least_one' END
ORDER BY MIN(cpc.prereq_count) ASC;