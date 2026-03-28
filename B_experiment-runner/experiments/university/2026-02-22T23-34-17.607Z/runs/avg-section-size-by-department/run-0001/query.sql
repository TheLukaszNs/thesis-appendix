WITH dept_section_max AS (
  SELECT
    d.id AS department_id,
    d.code AS department_code,
    d.name AS department_name,
    cs.max_students AS section_max_students
  FROM public.departments d
  JOIN public.courses c ON c.department_id = d.id
  JOIN public.course_sections cs ON cs.course_id = c.id
)
SELECT
  department_id AS department_id,
  department_code AS department_code,
  department_name AS department_name,
  ROUND(AVG(section_max_students)::numeric, 2) AS avg_max_section_size
FROM dept_section_max
GROUP BY department_id, department_code, department_name
ORDER BY department_name ASC;