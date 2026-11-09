-- Remise à zéro après les tests du 2026-11-09 : la première adhérente reçoit AFEL-2026-00101.
select setval('public.membres_num_seq', 100, true);
