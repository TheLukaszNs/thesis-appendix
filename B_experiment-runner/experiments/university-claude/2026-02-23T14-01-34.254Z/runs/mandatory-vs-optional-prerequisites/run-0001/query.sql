
SELECT 
  is_mandatory,
  COUNT(*) AS count
FROM prerequisites
GROUP BY is_mandatory
ORDER BY is_mandatory DESC
