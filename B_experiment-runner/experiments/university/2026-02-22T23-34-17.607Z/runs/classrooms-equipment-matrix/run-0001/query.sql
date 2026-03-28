WITH categorized AS (
  SELECT
    CASE
      WHEN has_projector AND has_computers THEN 'both'
      WHEN has_projector AND NOT has_computers THEN 'projector only'
      WHEN NOT has_projector AND has_computers THEN 'computers only'
      ELSE 'neither'
    END AS equipment_group
  FROM public.classrooms
)
SELECT
  equipment_group AS equipment_group,
  COUNT(*) AS classroom_count
FROM categorized
GROUP BY equipment_group
ORDER BY CASE equipment_group
  WHEN 'both' THEN 1
  WHEN 'projector only' THEN 2
  WHEN 'computers only' THEN 3
  WHEN 'neither' THEN 4
  ELSE 5
END;