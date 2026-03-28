SELECT
  ROUND(AVG(overall_rating)::numeric, 2) AS avg_overall_rating,
  ROUND(AVG(professor_rating)::numeric, 2) AS avg_professor_rating,
  ROUND(AVG(content_rating)::numeric, 2) AS avg_content_rating,
  ROUND(AVG(difficulty_rating)::numeric, 2) AS avg_difficulty_rating
FROM public.course_evaluations;