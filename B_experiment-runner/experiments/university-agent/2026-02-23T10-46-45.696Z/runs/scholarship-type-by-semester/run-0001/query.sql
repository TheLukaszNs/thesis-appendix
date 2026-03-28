SELECT
  semester_type AS semester_type,
  scholarship_type AS scholarship_type,
  COUNT(*) AS scholarship_count
FROM scholarships
GROUP BY semester_type, scholarship_type
ORDER BY semester_type ASC, scholarship_count DESC;