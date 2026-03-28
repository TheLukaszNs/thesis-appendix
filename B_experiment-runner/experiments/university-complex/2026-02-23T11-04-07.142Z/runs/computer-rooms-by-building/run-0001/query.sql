SELECT building AS building,
       COUNT(*) FILTER (WHERE has_computers = true) AS computer_lab_count
FROM public.classrooms
GROUP BY building
ORDER BY building ASC;