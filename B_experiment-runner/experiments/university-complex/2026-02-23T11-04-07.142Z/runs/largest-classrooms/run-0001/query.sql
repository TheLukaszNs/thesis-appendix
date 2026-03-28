SELECT building || ' ' || room_number AS classroom_label, capacity AS capacity, id AS classroom_id, building AS building, room_number AS room_number
FROM public.classrooms
ORDER BY capacity DESC, id ASC
LIMIT 10