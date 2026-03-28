SELECT c.building AS building, COUNT(c.id) AS classroom_count
FROM public.classrooms AS c
GROUP BY c.building
ORDER BY classroom_count DESC, building ASC;