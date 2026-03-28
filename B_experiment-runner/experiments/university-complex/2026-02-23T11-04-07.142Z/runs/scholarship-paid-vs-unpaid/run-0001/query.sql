SELECT
  CASE WHEN paid_date IS NOT NULL THEN 'Paid' ELSE 'Not Paid' END AS payment_status,
  COUNT(id) AS scholarship_count
FROM public.scholarships
GROUP BY CASE WHEN paid_date IS NOT NULL THEN 'Paid' ELSE 'Not Paid' END
ORDER BY CASE WHEN MIN(paid_date) IS NOT NULL THEN 1 ELSE 2 END, scholarship_count DESC;