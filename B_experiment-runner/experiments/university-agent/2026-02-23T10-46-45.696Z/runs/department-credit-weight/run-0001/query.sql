SELECT
departments.name AS department,
courses.credits AS credits,
COUNT(*) AS course_count
FROM courses
JOIN departments ON courses.department_id = departments.id
GROUP BY departments.name, courses.credits
ORDER BY departments.name, courses.credits;