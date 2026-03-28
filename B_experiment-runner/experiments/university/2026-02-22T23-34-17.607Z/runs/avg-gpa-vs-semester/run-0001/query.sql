SELECT current_semester AS semester,
       COUNT(1) FILTER (WHERE gpa IS NOT NULL) AS student_count,
       ROUND(AVG(gpa) FILTER (WHERE gpa IS NOT NULL), 2) AS avg_gpa
FROM public.students
GROUP BY current_semester
ORDER BY current_semester;