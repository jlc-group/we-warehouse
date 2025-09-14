-- Fix remaining function search_path issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_monthly_summary(user_uuid uuid, target_month text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  booking_count integer;
  total_time numeric(4,2);
  popular_room uuid;
BEGIN
  -- คำนวณจำนวนการจองทั้งหมด
  SELECT COUNT(*) INTO booking_count
  FROM bookings 
  WHERE user_id = user_uuid 
  AND to_char(booking_date, 'YYYY-MM') = target_month
  AND confirmation_status = 'confirmed';
  
  -- คำนวณเวลารวม (ชั่วโมง)
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (end_time::time - start_time::time))/3600
  ), 0) INTO total_time
  FROM bookings 
  WHERE user_id = user_uuid 
  AND to_char(booking_date, 'YYYY-MM') = target_month
  AND confirmation_status = 'confirmed';
  
  -- หาห้องที่ใช้บ่อยที่สุด
  SELECT room_id INTO popular_room
  FROM bookings 
  WHERE user_id = user_uuid 
  AND to_char(booking_date, 'YYYY-MM') = target_month
  AND confirmation_status = 'confirmed'
  GROUP BY room_id 
  ORDER BY COUNT(*) DESC 
  LIMIT 1;
  
  -- บันทึกหรืออัปเดตข้อมูล
  INSERT INTO monthly_summaries (user_id, month_year, total_bookings, total_hours, most_used_room_id)
  VALUES (user_uuid, target_month, booking_count, total_time, popular_room)
  ON CONFLICT (user_id, month_year) 
  DO UPDATE SET 
    total_bookings = EXCLUDED.total_bookings,
    total_hours = EXCLUDED.total_hours,
    most_used_room_id = EXCLUDED.most_used_room_id,
    updated_at = now();
END;
$function$;