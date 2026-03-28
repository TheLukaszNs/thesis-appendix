SELECT 
  course_type,
  AVG(credits) AS average_credits
FROM public.courses
GROUP BY course_type
ORDER BY course_type