TUCCI UPDATE - ORDER MATTERS

1) Supabase SQL editor: run RUN_FIRST_034_booking_paid.sql (10 seconds).
   The new code reads bookings.paid_at. Pushing before running this breaks
   Bookings, Check-In, and Schedule.

2) Laptop:
   git clone https://github.com/davefisher813/tucci-admin
   Unzip this over the folder (replace files), then:
   git add -A
   git commit -m "Security + paid tracking + UI cleanup"
   git push

3) Supabase SQL editor: run the RLS check query Claude gave you, send output.
