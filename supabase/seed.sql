-- OPTIONAL starter categories (not demo inventory). Delete or rename freely in Settings.
insert into categories (name) values
 ('Fasteners'),('Bearings & Bushings'),('Motors & Actuators'),('Electrical'),
 ('Pneumatics'),('Raw Material'),('Tools'),('Custom Parts')
on conflict do nothing;
