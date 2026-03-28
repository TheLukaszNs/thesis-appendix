SELECT
  ROUND(AVG(overall_rating)::numeric, 2) AS avg_overall,
  ROUND(AVG(professor_rating)::numeric, 2) AS avg_professor,
  ROUND(AVG(content_rating)::numeric, 2) AS avg_content,
  ROUND(AVG(difficulty_rating)::numeric, 2) AS avg_difficulty,
  COUNT(*) AS evaluations_count
FROM public.course_evaluations;