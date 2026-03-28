WITH averages AS (
  SELECT 'Overall'::text AS rating_category, ROUND(AVG(overall_rating), 2) AS average_rating FROM public.course_evaluations
  UNION ALL
  SELECT 'Professor'::text AS rating_category, ROUND(AVG(professor_rating), 2) AS average_rating FROM public.course_evaluations
  UNION ALL
  SELECT 'Content'::text AS rating_category, ROUND(AVG(content_rating), 2) AS average_rating FROM public.course_evaluations
  UNION ALL
  SELECT 'Difficulty'::text AS rating_category, ROUND(AVG(difficulty_rating), 2) AS average_rating FROM public.course_evaluations
)
SELECT rating_category, average_rating
FROM averages
ORDER BY CASE rating_category WHEN 'Overall' THEN 1 WHEN 'Professor' THEN 2 WHEN 'Content' THEN 3 WHEN 'Difficulty' THEN 4 ELSE 5 END;