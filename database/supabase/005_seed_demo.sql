/*
  RESILIAUNT — datos DEMOSTRATIVOS sintéticos.
  No usar para investigación, decisiones clínicas ni inferencias sobre personas reales.
  Son identificadores y observaciones ficticias generadas de forma determinista.
  Ejecutar después de 001, 002, 003 y 004.
*/

insert into oltp_resiliencia.sala_terapia
  (codigo_sala, nombre_sala, pabellon, modalidad, capacidad)
values
  ('DEMO-SALA-01', 'Sala demo individual', 'Bienestar Universitario (demo)', 'Presencial', 4),
  ('DEMO-SALA-02', 'Sala demo virtual', 'Atención virtual (demo)', 'Virtual', 10)
on conflict (codigo_sala) do nothing;

insert into oltp_resiliencia.terapeuta
  (codigo_terapeuta, nombre, especialidad)
values
  ('DEMO-TER-01', 'Profesional Demo 01', 'Atención psicológica (demo)'),
  ('DEMO-TER-02', 'Profesional Demo 02', 'Acompañamiento (demo)')
on conflict (codigo_terapeuta) do nothing;

insert into oltp_resiliencia.habito (codigo_habito, nombre, categoria)
values
  ('DEMO-HAB-01', 'Pausa consciente (demo)', 'Bienestar'),
  ('DEMO-HAB-02', 'Actividad física (demo)', 'Actividad'),
  ('DEMO-HAB-03', 'Contacto social (demo)', 'Social')
on conflict (codigo_habito) do nothing;

insert into oltp_resiliencia.estudiante
  (codigo_universitario, nombre_visible, ciclo_academico, turno)
select
  'DEMO-' || lpad(n::text, 3, '0'),
  'Estudiante demostrativo ' || lpad(n::text, 2, '0'),
  ((n - 1) % 10) + 1,
  case (n % 3) when 0 then 'Mañana' when 1 then 'Tarde' else 'Noche' end
from generate_series(1, 40) as g(n)
on conflict (codigo_universitario) do nothing;

insert into oltp_resiliencia.terapeuta_estudiante
  (id_terapeuta, id_estudiante, fecha_inicio, activo)
select
  t.id_terapeuta,
  e.id_estudiante,
  date '2025-01-01',
  true
from oltp_resiliencia.estudiante e
join oltp_resiliencia.terapeuta t
  on t.codigo_terapeuta = case
    when substring(e.codigo_universitario from 6)::integer % 2 = 0 then 'DEMO-TER-01'
    else 'DEMO-TER-02'
  end
where e.codigo_universitario like 'DEMO-%'
on conflict (id_terapeuta, id_estudiante) do update set activo = excluded.activo;

-- Una evaluación por estudiante y mes del año sintético 2026 (enero a octubre).
insert into oltp_resiliencia.evaluacion_clinica
  (id_estudiante, id_terapeuta, id_sala, fecha, indice_resiliencia,
   pensamientos_intrusivos, periodo_referencia_dias, cantidad_sesiones)
select
  e.id_estudiante,
  t.id_terapeuta,
  s.id_sala,
  make_date(2026, m.mes, 15),
  (45 + ((substring(e.codigo_universitario from 6)::integer * 7 + m.mes * 3) % 50))::numeric(5,2),
  ((substring(e.codigo_universitario from 6)::integer + m.mes * 2) % 9),
  30,
  ((m.mes + substring(e.codigo_universitario from 6)::integer) % 4) + 1
from oltp_resiliencia.estudiante e
cross join generate_series(1, 10) as m(mes)
join oltp_resiliencia.terapeuta t
  on t.codigo_terapeuta = case
    when substring(e.codigo_universitario from 6)::integer % 2 = 0 then 'DEMO-TER-01'
    else 'DEMO-TER-02'
  end
join oltp_resiliencia.sala_terapia s
  on s.codigo_sala = case when m.mes % 2 = 0 then 'DEMO-SALA-02' else 'DEMO-SALA-01' end
where e.codigo_universitario like 'DEMO-%'
on conflict (id_estudiante, fecha) do update set
  indice_resiliencia = excluded.indice_resiliencia,
  pensamientos_intrusivos = excluded.pensamientos_intrusivos,
  periodo_referencia_dias = excluded.periodo_referencia_dias,
  cantidad_sesiones = excluded.cantidad_sesiones;

-- Registros de hábitos sintéticos: dos hábitos por estudiante y mes.
insert into oltp_resiliencia.registro_habito
  (id_estudiante, id_habito, fecha, intensidad, completado)
select
  e.id_estudiante,
  h.id_habito,
  make_date(2026, m.mes, case when h.n = 1 then 5 else 20 end),
  case ((substring(e.codigo_universitario from 6)::integer + m.mes + h.n) % 3)
    when 0 then 'Alta' when 1 then 'Media' else 'Baja' end,
  ((substring(e.codigo_universitario from 6)::integer + m.mes + h.n) % 2 = 0)
from oltp_resiliencia.estudiante e
cross join generate_series(1, 10) as m(mes)
cross join (values (1, 'DEMO-HAB-01'), (2, 'DEMO-HAB-02')) as h(n, codigo)
join oltp_resiliencia.habito hb on hb.codigo_habito = h.codigo
where e.codigo_universitario like 'DEMO-%'
on conflict (id_estudiante, id_habito, fecha) do update set
  intensidad = excluded.intensidad,
  completado = excluded.completado;

-- Dos metas demostrativas por estudiante, sin contenido personal real.
insert into oltp_resiliencia.meta_personal
  (codigo_meta, id_estudiante, categoria, descripcion, fecha_creacion, fecha_objetivo)
select
  'DEMO-META-' || lpad(substring(e.codigo_universitario from 6), 3, '0') || '-' || n,
  e.id_estudiante,
  case n when 1 then 'Bienestar' else 'Organización personal' end,
  'Meta demostrativa ' || n,
  date '2026-01-01',
  date '2026-12-31'
from oltp_resiliencia.estudiante e
cross join generate_series(1, 2) as g(n)
where e.codigo_universitario like 'DEMO-%'
on conflict (codigo_meta) do nothing;

insert into oltp_resiliencia.registro_meta (id_meta, fecha, estado)
select
  mp.id_meta,
  make_date(2026, m.mes, 25),
  case
    when (substring(e.codigo_universitario from 6)::integer + m.mes +
          substring(mp.codigo_meta from length(mp.codigo_meta) for 1)::integer) % 3 = 0
    then 'Cumplida' else 'Pendiente' end
from oltp_resiliencia.meta_personal mp
join oltp_resiliencia.estudiante e on e.id_estudiante = mp.id_estudiante
cross join generate_series(1, 10) as m(mes)
where mp.codigo_meta like 'DEMO-META-%'
on conflict (id_meta, fecha) do update set estado = excluded.estado;

-- Red de apoyo: evaluación independiente mensual; interacciones quedan como variable complementaria.
insert into oltp_resiliencia.evaluacion_red_apoyo
  (id_estudiante, id_terapeuta, fecha, periodo_referencia_dias, red_apoyo_activa, contactos_activos, interacciones_sociales)
select
  e.id_estudiante,
  t.id_terapeuta,
  make_date(2026, m.mes, 28),
  30,
  ((substring(e.codigo_universitario from 6)::integer + m.mes) % 4 <> 0),
  ((substring(e.codigo_universitario from 6)::integer + m.mes) % 4),
  ((substring(e.codigo_universitario from 6)::integer * 2 + m.mes) % 11)
from oltp_resiliencia.estudiante e
join oltp_resiliencia.terapeuta t
  on t.codigo_terapeuta = case
    when substring(e.codigo_universitario from 6)::integer % 2 = 0 then 'DEMO-TER-01'
    else 'DEMO-TER-02' end
cross join generate_series(1, 10) as m(mes)
where e.codigo_universitario like 'DEMO-%'
on conflict (id_estudiante, fecha) do update set
  id_terapeuta = excluded.id_terapeuta,
  red_apoyo_activa = excluded.red_apoyo_activa,
  contactos_activos = excluded.contactos_activos,
  interacciones_sociales = excluded.interacciones_sociales;

call datamart_resiliencia.sp_refresh_datamart();

-- Validación básica del conjunto demostrativo.
select
  (select count(*) from oltp_resiliencia.estudiante where codigo_universitario like 'DEMO-%') as estudiantes_demo,
  (select count(*) from oltp_resiliencia.evaluacion_clinica e join oltp_resiliencia.estudiante s using (id_estudiante) where s.codigo_universitario like 'DEMO-%') as evaluaciones_demo,
  (select count(*) from oltp_resiliencia.registro_habito r join oltp_resiliencia.estudiante s using (id_estudiante) where s.codigo_universitario like 'DEMO-%') as registros_habitos_demo,
  (select count(*) from datamart_resiliencia.fact_seguimiento_meta) as hechos_metas_demo,
  (select count(*) from datamart_resiliencia.fact_red_apoyo) as hechos_red_demo;
