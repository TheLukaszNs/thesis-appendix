WITH student_counts AS (
  SELECT department_id AS department_id, COUNT(*) AS student_count
  FROM students
  GROUP BY department_id
),
professor_counts AS (
  SELECT department_id AS department_id, COUNT(*) AS professor_count
  FROM professors
  GROUP BY department_id
)
SELECT
  d.id AS department_id,
  d.name AS department_name,
  COALESCE(s.student_count, 0) AS student_count,
  COALESCE(p.professor_count, 0) AS professor_count,
  CASE WHEN COALESCE(p.professor_count, 0) = 0 THEN NULL
       ELSE CAST(COALESCE(s.student_count, 0) AS FLOAT) / p.professor_count
  END AS student_professor_ratio
FROM departments d
LEFT JOIN student_counts s ON d.id = s.department_id
LEFT JOIN professor_counts p ON d.id = p.department_id
ORDER BY d.name;