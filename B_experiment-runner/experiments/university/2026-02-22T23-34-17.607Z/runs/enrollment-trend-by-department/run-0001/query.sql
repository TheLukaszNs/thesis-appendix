WITH dept_year_enrollments AS (
  SELECT
    d.id AS department_id,
    d.code AS department_code,
    d.name AS department_name,
    cs.academic_year AS academic_year,
    COUNT(e.id) AS enrollments_count
  FROM public.enrollments e
  JOIN public.course_sections cs ON e.course_section_id = cs.id
  JOIN public.courses c ON cs.course_id = c.id
  JOIN public.departments d ON c.department_id = d.id
  WHERE e.is_active = true
  GROUP BY d.id, d.code, d.name, cs.academic_year
)
SELECT
  department_id,
  department_code,
  department_name,
  academic_year,
  enrollments_count
FROM dept_year_enrollments
ORDER BY department_code ASC, academic_year ASC;