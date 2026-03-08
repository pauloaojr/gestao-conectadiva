UPDATE public.establishments
SET timezone = 'GMT-3'
WHERE timezone IS NULL
   OR NOT (
     timezone ~* '^GMT[+-](0?[0-9]|1[0-2])$'
     OR timezone ~* '^[A-Za-z_]+(?:/[A-Za-z_]+){1,2}$'
   );

ALTER TABLE public.establishments
DROP CONSTRAINT IF EXISTS establishments_timezone_format_check;

ALTER TABLE public.establishments
ADD CONSTRAINT establishments_timezone_format_check
CHECK (
  timezone ~* '^GMT[+-](0?[0-9]|1[0-2])$'
  OR timezone ~* '^[A-Za-z_]+(?:/[A-Za-z_]+){1,2}$'
);
