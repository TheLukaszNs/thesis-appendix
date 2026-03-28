SELECT s.id AS student_id,
       s.first_name || ' ' || s.last_name AS student_name,
       s.index_number AS student_index_number,
       SUM(sc.amount) AS total_scholarship_amount
FROM public.students AS s
JOIN public.scholarships AS sc
  ON sc.student_id = s.id
GROUP BY s.id, s.first_name, s.last_name, s.index_number
ORDER BY total_scholarship_amount DESC, s.id;