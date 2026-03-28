SELECT d.id AS department_id,
       d.code AS department_code,
       d.name AS department_name,
       COALESCE(s.student_count, 0) AS students_count,
       COALESCE(p.professor_count, 0) AS professors_count,
       CASE WHEN COALESCE(p.professor_count, 0) = 0 THEN NULL
            ELSE ROUND((s.student_count::numeric / p.professor_count::numeric)::numeric, 2)
       END AS student_to_professor_ratio
FROM public.departments d
LEFT JOIN (
  SELECT department_id, COUNT(*) AS student_count
  FROM public.students
  GROUP BY department_id
) s ON s.department_id = d.id
LEFT JOIN (
  SELECT department_id, COUNT(*) AS professor_count
  FROM public.professors
  GROUP BY department_id
) p ON p.department_id = d.id
ORDER BY d.name ASC;