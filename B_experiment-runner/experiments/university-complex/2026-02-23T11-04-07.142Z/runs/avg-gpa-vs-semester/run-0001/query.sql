SELECT s.current_semester AS semester,
       AVG(s.gpa) AS avg_gpa,
       COUNT(s.id) AS student_count
FROM public.students AS s
WHERE s.gpa IS NOT NULL
GROUP BY s.current_semester
ORDER BY semester ASC;