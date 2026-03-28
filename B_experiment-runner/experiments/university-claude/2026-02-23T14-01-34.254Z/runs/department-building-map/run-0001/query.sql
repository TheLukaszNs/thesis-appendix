SELECT 
  d.building,
  d.name AS department_name,
  d.code AS department_code
FROM public.departments d
WHERE d.building IS NOT NULL
ORDER BY d.building, d.name