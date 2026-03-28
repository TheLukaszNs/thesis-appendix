SELECT c.building AS building,
       COUNT(cs.id) AS sections_count
FROM public.course_sections AS cs
JOIN public.classrooms AS c
  ON cs.classroom_id = c.id
WHERE cs.classroom_id IS NOT NULL
GROUP BY c.building
ORDER BY c.building ASC;