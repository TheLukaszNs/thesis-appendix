SELECT s.current_semester AS semester, COUNT(*) AS student_count
FROM public.students AS s
GROUP BY s.current_semester
ORDER BY s.current_semester ASC;