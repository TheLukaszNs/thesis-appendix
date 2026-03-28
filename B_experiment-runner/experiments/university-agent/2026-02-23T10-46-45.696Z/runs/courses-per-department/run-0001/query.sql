WITH dept_courses AS (
  SELECT
    d.id AS department_id,
    d.name AS department_name,
    COUNT(c.id) AS course_count
  FROM departments d
  LEFT JOIN courses c ON c.department_id = d.id
  GROUP BY d.id, d.name
)
SELECT
  department_id,
  department_name,
  course_count
FROM dept_courses
ORDER BY course_count DESC, department_name ASC;