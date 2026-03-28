SELECT p.prerequisite_course_id AS pr_course_id, c.code AS pr_course_code, c.name AS pr_course_name, COUNT(DISTINCT p.course_id) AS dependent_count
FROM public.prerequisites p
INNER JOIN public.courses c
  ON p.prerequisite_course_id = c.id
GROUP BY p.prerequisite_course_id, c.code, c.name
ORDER BY dependent_count DESC, pr_course_code ASC;