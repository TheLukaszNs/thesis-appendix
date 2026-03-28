
SELECT 
  CASE WHEN paid_date IS NOT NULL THEN 'Paid' ELSE 'Not Yet Paid' END AS payment_status,
  COUNT(*) AS scholarship_count
FROM public.scholarships
GROUP BY CASE WHEN paid_date IS NOT NULL THEN 'Paid' ELSE 'Not Yet Paid' END
ORDER BY payment_status DESC
