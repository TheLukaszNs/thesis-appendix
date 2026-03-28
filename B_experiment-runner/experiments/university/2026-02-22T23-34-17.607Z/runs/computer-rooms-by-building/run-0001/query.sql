SELECT building AS building, COUNT(*) AS computer_labs
FROM public.classrooms
WHERE has_computers = true
GROUP BY building
ORDER BY building ASC;