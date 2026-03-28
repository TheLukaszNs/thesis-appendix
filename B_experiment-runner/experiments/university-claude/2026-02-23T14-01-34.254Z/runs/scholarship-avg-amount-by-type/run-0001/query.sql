SELECT 
  scholarship_type,
  AVG(amount) AS average_amount
FROM public.scholarships
GROUP BY scholarship_type
ORDER BY scholarship_type