SELECT d.name AS department,
       ROUND(COALESCE(SUM(sc.amount), 0) / NULLIF(COUNT(DISTINCT s.id), 0), 2) AS avg_scholarship_per_student
FROM departments d
JOIN students s ON s.department_id = d.id
LEFT JOIN scholarships sc ON sc.student_id = s.id
GROUP BY d.name
ORDER BY avg_scholarship_per_student DESC;