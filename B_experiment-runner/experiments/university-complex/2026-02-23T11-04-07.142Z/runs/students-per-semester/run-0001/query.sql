SELECT s.current_semester AS semester, COUNT(s.id) AS student_count
FROM public.students AS s
GROUP BY s.current_semester
ORDER BY semester ASC;