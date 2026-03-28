SELECT
  'Students with >1 scholarships'::text AS label,
  (
    SELECT COUNT(*)
    FROM (
      SELECT scholarships.student_id
      FROM public.scholarships AS scholarships
      GROUP BY scholarships.student_id
      HAVING COUNT(*) > 1
    ) AS t
  ) AS students_with_multiple_scholarships;