WITH categorized AS (
  SELECT
    CASE
      WHEN has_projector AND has_computers THEN 'both'
      WHEN has_projector AND NOT has_computers THEN 'projector_only'
      WHEN has_computers AND NOT has_projector THEN 'computers_only'
      ELSE 'neither'
    END AS equipment_type
  FROM public.classrooms
)
SELECT
  equipment_type,
  COUNT(*) AS classroom_count
FROM categorized
GROUP BY equipment_type
ORDER BY
  CASE equipment_type
    WHEN 'both' THEN 1
    WHEN 'projector_only' THEN 2
    WHEN 'computers_only' THEN 3
    WHEN 'neither' THEN 4
    ELSE 5
  END;