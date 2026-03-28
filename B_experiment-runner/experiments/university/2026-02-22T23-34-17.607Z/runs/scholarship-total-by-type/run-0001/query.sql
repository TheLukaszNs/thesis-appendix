SELECT scholarship_type AS scholarship_type, SUM(amount) AS total_amount
FROM public.scholarships
GROUP BY scholarship_type
ORDER BY SUM(amount) DESC, scholarship_type ASC;