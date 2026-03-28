SELECT
  status,
  scholarships_count
FROM (
  SELECT
    CASE WHEN paid_date IS NOT NULL THEN 'Paid' ELSE 'Not Paid' END AS status,
    COUNT(*)::bigint AS scholarships_count
  FROM public.scholarships
  GROUP BY CASE WHEN paid_date IS NOT NULL THEN 'Paid' ELSE 'Not Paid' END
) t
ORDER BY CASE WHEN status = 'Paid' THEN 1 ELSE 2 END;