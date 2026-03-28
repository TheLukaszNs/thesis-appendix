SELECT s.scholarship_type AS scholarship_type,
       COUNT(DISTINCT s.student_id) AS student_count
FROM public.scholarships AS s
GROUP BY s.scholarship_type
ORDER BY student_count DESC, scholarship_type ASC;