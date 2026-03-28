SELECT 
  academic_title,
  COUNT(*) AS professor_count
FROM professors
GROUP BY academic_title
ORDER BY professor_count DESC, academic_title ASC