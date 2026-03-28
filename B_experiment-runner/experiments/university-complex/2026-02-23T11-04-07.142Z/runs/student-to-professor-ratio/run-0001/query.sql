SELECT
  d.id AS department_id,
  d.name AS department_name,
  COALESCE(s_cnt.student_count, 0) AS student_count,
  COALESCE(p_cnt.professor_count, 0) AS professor_count,
  CASE WHEN COALESCE(p_cnt.professor_count, 0) = 0 THEN NULL ELSE COALESCE(s_cnt.student_count, 0)::numeric / p_cnt.professor_count END AS student_to_professor_ratio
FROM public.departments d
LEFT JOIN (
  SELECT department_id, COUNT(*) AS student_count
  FROM public.students
  GROUP BY department_id
) s_cnt ON s_cnt.department_id = d.id
LEFT JOIN (
  SELECT department_id, COUNT(*) AS professor_count
  FROM public.professors
  GROUP BY department_id
) p_cnt ON p_cnt.department_id = d.id
ORDER BY d.name ASC;