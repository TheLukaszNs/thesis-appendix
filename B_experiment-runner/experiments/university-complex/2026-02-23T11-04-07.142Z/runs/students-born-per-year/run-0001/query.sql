SELECT EXTRACT(YEAR FROM st.date_of_birth)::INT AS birth_year, COUNT(*) AS student_count
FROM public.students AS st
WHERE st.date_of_birth IS NOT NULL
GROUP BY EXTRACT(YEAR FROM st.date_of_birth)::INT
ORDER BY birth_year;