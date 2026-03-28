SELECT COUNT(DISTINCT student_id) AS student_count
FROM scholarships
GROUP BY student_id
HAVING COUNT(*) > 1