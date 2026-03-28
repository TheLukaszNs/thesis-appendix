WITH prof_section_counts AS (
  SELECT
    p.id AS professor_id,
    p.department_id AS department_id,
    COUNT(cs.id) AS sections_count
  FROM public.professors p
  LEFT JOIN public.course_sections cs
    ON cs.professor_id = p.id
  GROUP BY p.id, p.department_id
)
SELECT
  d.id AS department_id,
  d.code AS department_code,
  d.name AS department_name,
  COUNT(p.professor_id) AS professor_count,
  COALESCE(SUM(p.sections_count), 0) AS total_sections,
  ROUND(COALESCE(SUM(p.sections_count), 0)::numeric / NULLIF(COUNT(p.professor_id), 0), 2) AS avg_sections_per_professor
FROM public.departments d
LEFT JOIN prof_section_counts p
  ON p.department_id = d.id
GROUP BY d.id, d.code, d.name
ORDER BY d.name;