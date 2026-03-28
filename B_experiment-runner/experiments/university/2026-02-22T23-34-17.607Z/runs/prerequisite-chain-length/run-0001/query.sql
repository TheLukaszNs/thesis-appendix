WITH per_prereq AS (
  SELECT
    prerequisite_course_id AS course_id,
    COUNT(*) AS num_dependent_courses
  FROM public.prerequisites
  GROUP BY prerequisite_course_id
), max_count AS (
  SELECT MAX(num_dependent_courses) AS max_dep FROM per_prereq
)
SELECT
  c.id AS course_id,
  c.code AS course_code,
  c.name AS course_name,
  p.num_dependent_courses AS num_dependent_courses
FROM per_prereq p
JOIN public.courses c ON c.id = p.course_id
JOIN max_count m ON p.num_dependent_courses = m.max_dep
ORDER BY c.code ASC;