WITH types AS (
  SELECT DISTINCT course_type AS course_type
  FROM public.courses
), dept_types AS (
  SELECT
    d.id AS department_id,
    d.code AS department_code,
    d.name AS department_name,
    t.course_type AS course_type
  FROM public.departments d
  CROSS JOIN types t
), course_counts AS (
  SELECT
    department_id,
    course_type,
    COUNT(*) AS cnt
  FROM public.courses
  GROUP BY department_id, course_type
)
SELECT
  dt.department_id AS department_id,
  dt.department_code AS department_code,
  dt.department_name AS department_name,
  dt.course_type AS course_type,
  COALESCE(cc.cnt, 0) AS course_count
FROM dept_types dt
LEFT JOIN course_counts cc
  ON cc.department_id = dt.department_id
  AND cc.course_type = dt.course_type
ORDER BY dt.department_name, dt.course_type;