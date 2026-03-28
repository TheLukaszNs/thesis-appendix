
SELECT 
  amount,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM public.scholarships
GROUP BY amount
ORDER BY amount ASC
