/*
  RESILIAUNT — Generador integral de demostración para Supabase.
  Adapta el generador original de 200 estudiantes / 12 meses al OLTP normalizado
  vigente (001_oltp.sql): evaluaciones, hábitos, metas, red de apoyo y sesiones.
  Es idempotente: usa claves naturales + UPSERT; las sesiones se insertan solo
  cuando no existe el mismo estudiante/terapeuta/instante.
  Todos los registros llevan prefijo/código DEMO y son exclusivamente sintéticos.
  Ventana: últimos 12 meses calendario completos (no fechas futuras).
*/

begin;

-- 1. Catálogos de demostración. No se presupone ningún ID identity.
insert into oltp_resiliencia.sala_terapia
  (codigo_sala, nombre_sala, pabellon, modalidad, capacidad)
values
  ('DEMO-SALA-01', 'Sala demo individual', 'Bienestar Universitario (demo)', 'Presencial', 5),
  ('DEMO-SALA-02', 'Sala demo grupal', 'Bienestar Universitario (demo)', 'Presencial', 15),
  ('DEMO-SALA-03', 'Sala demo virtual', 'Atención virtual (demo)', 'Virtual', 10)
on conflict (codigo_sala) do update set
  nombre_sala = excluded.nombre_sala,
  pabellon = excluded.pabellon,
  modalidad = excluded.modalidad,
  capacidad = excluded.capacidad,
  activo = true;

insert into oltp_resiliencia.terapeuta
  (codigo_terapeuta, nombre, especialidad)
values
  ('DEMO-TER-01', 'Profesional Demo 01', 'Atención psicológica (demo)'),
  ('DEMO-TER-02', 'Profesional Demo 02', 'Acompañamiento (demo)'),
  ('DEMO-TER-03', 'Profesional Demo 03', 'Orientación (demo)')
on conflict (codigo_terapeuta) do update set
  nombre = excluded.nombre,
  especialidad = excluded.especialidad,
  activo = true;

insert into oltp_resiliencia.habito (codigo_habito, nombre, categoria)
values
  ('DEMO-HAB-01', 'Pausa consciente (demo)', 'Bienestar'),
  ('DEMO-HAB-02', 'Actividad física (demo)', 'Actividad'),
  ('DEMO-HAB-03', 'Contacto social (demo)', 'Social')
on conflict (codigo_habito) do update set
  nombre = excluded.nombre,
  categoria = excluded.categoria,
  activo = true;

-- 2. Padrón de 200 estudiantes sintéticos. Conserva los IDs existentes.
insert into oltp_resiliencia.estudiante
  (codigo_universitario, nombre_visible, carrera, ciclo_academico, turno, activo)
select
  'DEMO-' || lpad(g.n::text, 3, '0'),
  'Estudiante demostrativo ' || lpad(g.n::text, 3, '0'),
  'Ingeniería de Sistemas',
  ((g.n - 1) % 10) + 1,
  case (g.n % 3) when 0 then 'Mañana' when 1 then 'Tarde' else 'Noche' end,
  true
from generate_series(1, 200) as g(n)
on conflict (codigo_universitario) do update set
  nombre_visible = excluded.nombre_visible,
  carrera = excluded.carrera,
  ciclo_academico = excluded.ciclo_academico,
  turno = excluded.turno,
  activo = true;

-- 3. Una asignación activa por estudiante demo, distribuida entre 3 terapeutas.
-- Cierra solo la asignación demo anterior si el generador cambia de terapeuta.
update oltp_resiliencia.terapeuta_estudiante te
set activo = false,
    fecha_fin = current_date
from oltp_resiliencia.estudiante e
join oltp_resiliencia.terapeuta t
  on t.codigo_terapeuta = case
    when mod(substring(e.codigo_universitario from 6)::integer, 3) = 0 then 'DEMO-TER-03'
    when mod(substring(e.codigo_universitario from 6)::integer, 3) = 1 then 'DEMO-TER-01'
    else 'DEMO-TER-02'
  end
where te.id_estudiante = e.id_estudiante
  and e.codigo_universitario like 'DEMO-%'
  and te.activo = true
  and te.id_terapeuta <> t.id_terapeuta;

insert into oltp_resiliencia.terapeuta_estudiante
  (id_terapeuta, id_estudiante, fecha_inicio, activo)
select
  t.id_terapeuta,
  e.id_estudiante,
  date '2025-11-01',
  true
from oltp_resiliencia.estudiante e
join oltp_resiliencia.terapeuta t
  on t.codigo_terapeuta = case
    when mod(substring(e.codigo_universitario from 6)::integer, 3) = 0 then 'DEMO-TER-03'
    when mod(substring(e.codigo_universitario from 6)::integer, 3) = 1 then 'DEMO-TER-01'
    else 'DEMO-TER-02'
  end
where e.codigo_universitario like 'DEMO-%'
  and not exists (
    select 1
    from oltp_resiliencia.terapeuta_estudiante current_assignment
    where current_assignment.id_estudiante = e.id_estudiante
      and current_assignment.id_terapeuta = t.id_terapeuta
      and current_assignment.activo = true
  );

-- 4. Doce evaluaciones clínicas por estudiante: 200 x 12 = 2,400.
with demo_students as (
  select e.id_estudiante,
         substring(e.codigo_universitario from 6)::integer as n
  from oltp_resiliencia.estudiante e
  where e.codigo_universitario like 'DEMO-%'
),
months as (
  select m.n as month_offset,
         (date_trunc('month', current_date) - interval '12 months'
           + make_interval(months => m.n))::date as month_start
  from generate_series(0, 11) as m(n)
)
insert into oltp_resiliencia.evaluacion_clinica
  (id_estudiante, id_terapeuta, id_sala, fecha, indice_resiliencia,
   pensamientos_intrusivos, periodo_referencia_dias, cantidad_sesiones)
select
  s.id_estudiante,
  t.id_terapeuta,
  r.id_sala,
  make_date(extract(year from m.month_start)::integer,
            extract(month from m.month_start)::integer, 15),
  (48 + mod(s.n * 11 + m.month_offset * 7, 43))::numeric(5,2),
  mod(s.n + m.month_offset * 2, 8),
  30,
  1 + mod(s.n + m.month_offset, 4)
from demo_students s
cross join months m
join oltp_resiliencia.terapeuta t
  on t.codigo_terapeuta = case
    when mod(s.n, 3) = 0 then 'DEMO-TER-03'
    when mod(s.n, 3) = 1 then 'DEMO-TER-01'
    else 'DEMO-TER-02'
  end
join oltp_resiliencia.sala_terapia r
  on r.codigo_sala = case
    when mod(s.n + m.month_offset, 3) = 0 then 'DEMO-SALA-03'
    when mod(s.n + m.month_offset, 3) = 1 then 'DEMO-SALA-01'
    else 'DEMO-SALA-02'
  end
on conflict (id_estudiante, fecha) do update set
  id_terapeuta = excluded.id_terapeuta,
  id_sala = excluded.id_sala,
  indice_resiliencia = excluded.indice_resiliencia,
  pensamientos_intrusivos = excluded.pensamientos_intrusivos,
  periodo_referencia_dias = excluded.periodo_referencia_dias,
  cantidad_sesiones = excluded.cantidad_sesiones;

-- 5. Entre 9 y 12 registros de hábitos por estudiante y mes
-- (21,600 a 28,800 registros para 200 estudiantes y 12 meses).
with demo_students as (
  select e.id_estudiante,
         substring(e.codigo_universitario from 6)::integer as n
  from oltp_resiliencia.estudiante e
  where e.codigo_universitario like 'DEMO-%'
),
months as (
  select m.n as month_offset,
         (date_trunc('month', current_date) - interval '12 months'
           + make_interval(months => m.n))::date as month_start
  from generate_series(0, 11) as m(n)
),
activity as (
  select s.id_estudiante, s.n, m.month_offset, m.month_start, j.n as activity_n,
         (9 + mod(s.n + m.month_offset, 4)) as month_records
  from demo_students s
  cross join months m
  cross join generate_series(1, 12) as j(n)
)
insert into oltp_resiliencia.registro_habito
  (id_estudiante, id_habito, fecha, intensidad, completado)
select
  a.id_estudiante,
  h.id_habito,
  a.month_start + mod(a.n * 5 + a.month_offset * 7 + a.activity_n * 2, 26),
  case mod(a.n + a.month_offset + a.activity_n, 3)
    when 0 then 'Alta' when 1 then 'Media' else 'Baja' end,
  (mod(a.n * 11 + a.month_offset * 5 + a.activity_n * 3, 10) < 6)
from activity a
join oltp_resiliencia.habito h
  on h.codigo_habito = 'DEMO-HAB-0' || (mod(a.n + a.month_offset + a.activity_n - 1, 3) + 1)::text
where a.activity_n <= a.month_records
on conflict (id_estudiante, id_habito, fecha) do update set
  intensidad = excluded.intensidad,
  completado = excluded.completado;

-- 6. Dos metas por estudiante (400 metas) y doce estados por meta (4,800 estados).
with demo_students as (
  select e.id_estudiante,
         substring(e.codigo_universitario from 6)::integer as n
  from oltp_resiliencia.estudiante e
  where e.codigo_universitario like 'DEMO-%'
),
goals as (
  select s.id_estudiante, s.n, g.goal_n,
         'DEMO-META-' || lpad(s.n::text, 3, '0') || '-' || g.goal_n::text as goal_code
  from demo_students s
  cross join generate_series(1, 2) as g(goal_n)
)
insert into oltp_resiliencia.meta_personal
  (codigo_meta, id_estudiante, categoria, descripcion, fecha_creacion, fecha_objetivo, activa)
select
  g.goal_code,
  g.id_estudiante,
  case
    when g.goal_n = 1 then 'Bienestar'
    when mod(g.n, 2) = 0 then 'Organización personal'
    else 'Académica'
  end,
  'Meta demostrativa ' || g.goal_n::text || ' del estudiante ' || lpad(g.n::text, 3, '0'),
  (date_trunc('month', current_date) - interval '12 months')::date,
  ((date_trunc('month', current_date) - interval '12 months')::date + 365),
  true
from goals g
on conflict (codigo_meta) do update set
  id_estudiante = excluded.id_estudiante,
  categoria = excluded.categoria,
  descripcion = excluded.descripcion,
  fecha_creacion = excluded.fecha_creacion,
  fecha_objetivo = excluded.fecha_objetivo,
  activa = true;

with months as (
  select m.n as month_offset,
         (date_trunc('month', current_date) - interval '12 months'
           + make_interval(months => m.n))::date as month_start
  from generate_series(0, 11) as m(n)
),
goals as (
  select mp.id_meta, mp.id_estudiante,
         substring(e.codigo_universitario from 6)::integer as n,
         right(mp.codigo_meta, 1)::integer as goal_n
  from oltp_resiliencia.meta_personal mp
  join oltp_resiliencia.estudiante e on e.id_estudiante = mp.id_estudiante
  where mp.codigo_meta like 'DEMO-META-%'
)
insert into oltp_resiliencia.registro_meta (id_meta, fecha, estado)
select
  g.id_meta,
  m.month_start + 24,
  case when mod(g.n + m.month_offset + g.goal_n, 4) in (0, 1)
    then 'Cumplida' else 'Pendiente' end
from goals g
cross join months m
on conflict (id_meta, fecha) do update set
  estado = excluded.estado;

-- 7. Una valoración independiente de red de apoyo por estudiante y mes: 2,400.
with demo_students as (
  select e.id_estudiante,
         substring(e.codigo_universitario from 6)::integer as n
  from oltp_resiliencia.estudiante e
  where e.codigo_universitario like 'DEMO-%'
),
months as (
  select m.n as month_offset,
         (date_trunc('month', current_date) - interval '12 months'
           + make_interval(months => m.n))::date as month_start
  from generate_series(0, 11) as m(n)
)
insert into oltp_resiliencia.evaluacion_red_apoyo
  (id_estudiante, id_terapeuta, fecha, periodo_referencia_dias,
   red_apoyo_activa, contactos_activos, interacciones_sociales)
select
  s.id_estudiante,
  t.id_terapeuta,
  m.month_start + 27,
  30,
  (mod(s.n + m.month_offset, 4) <> 0),
  mod(s.n + m.month_offset, 6),
  mod(s.n * 2 + m.month_offset * 3, 18)
from demo_students s
cross join months m
join oltp_resiliencia.terapeuta t
  on t.codigo_terapeuta = case
    when mod(s.n, 3) = 0 then 'DEMO-TER-03'
    when mod(s.n, 3) = 1 then 'DEMO-TER-01'
    else 'DEMO-TER-02'
  end
on conflict (id_estudiante, fecha) do update set
  id_terapeuta = excluded.id_terapeuta,
  periodo_referencia_dias = excluded.periodo_referencia_dias,
  red_apoyo_activa = excluded.red_apoyo_activa,
  contactos_activos = excluded.contactos_activos,
  interacciones_sociales = excluded.interacciones_sociales;

-- 8. Una sesión histórica por mes y estudiante: 2,400 sesiones.
-- Solo inserta si no existe la misma sesión; estados pasados coherentes.
with demo_students as (
  select e.id_estudiante,
         substring(e.codigo_universitario from 6)::integer as n
  from oltp_resiliencia.estudiante e
  where e.codigo_universitario like 'DEMO-%'
),
months as (
  select m.n as month_offset,
         (date_trunc('month', current_date) - interval '12 months'
           + make_interval(months => m.n))::date as month_start
  from generate_series(0, 11) as m(n)
),
session_rows as (
  select
    s.id_estudiante,
    t.id_terapeuta,
    r.id_sala,
    make_timestamptz(
      extract(year from m.month_start)::integer,
      extract(month from m.month_start)::integer,
      10,
      8 + mod(s.n + m.month_offset, 9),
      case when mod(s.n + m.month_offset, 2) = 0 then 0 else 30 end,
      0,
      'America/Lima'
    ) as starts_at,
    r.modalidad,
    case
      when mod(s.n + m.month_offset, 10) < 7 then 'Realizada'
      when mod(s.n + m.month_offset, 10) < 9 then 'Cancelada'
      else 'No asistió'
    end as session_status
  from demo_students s
  cross join months m
  join oltp_resiliencia.terapeuta t
    on t.codigo_terapeuta = case
      when mod(s.n, 3) = 0 then 'DEMO-TER-03'
      when mod(s.n, 3) = 1 then 'DEMO-TER-01'
      else 'DEMO-TER-02'
    end
  join oltp_resiliencia.sala_terapia r
    on r.codigo_sala = case
      when mod(s.n + m.month_offset, 3) = 0 then 'DEMO-SALA-03'
      when mod(s.n + m.month_offset, 3) = 1 then 'DEMO-SALA-01'
      else 'DEMO-SALA-02'
    end
)
insert into oltp_resiliencia.sesion_terapia
  (id_estudiante, id_terapeuta, id_sala, inicio, fin, estado, modalidad)
select
  sr.id_estudiante,
  sr.id_terapeuta,
  sr.id_sala,
  sr.starts_at,
  case when sr.session_status = 'Realizada'
    then sr.starts_at + interval '50 minutes' else null end,
  sr.session_status,
  sr.modalidad
from session_rows sr
where not exists (
  select 1
  from oltp_resiliencia.sesion_terapia existing
  where existing.id_estudiante = sr.id_estudiante
    and existing.id_terapeuta = sr.id_terapeuta
    and existing.inicio = sr.starts_at
);

-- Una próxima sesión programada por estudiante para probar la agenda del portal.
with demo_students as (
  select e.id_estudiante,
         substring(e.codigo_universitario from 6)::integer as n
  from oltp_resiliencia.estudiante e
  where e.codigo_universitario like 'DEMO-%'
),
session_rows as (
  select
    s.id_estudiante,
    t.id_terapeuta,
    r.id_sala,
    make_timestamptz(
      extract(year from (current_date + 7 + mod(s.n, 14)))::integer,
      extract(month from (current_date + 7 + mod(s.n, 14)))::integer,
      extract(day from (current_date + 7 + mod(s.n, 14)))::integer,
      8 + mod(s.n, 9),
      case when mod(s.n, 2) = 0 then 0 else 30 end,
      0,
      'America/Lima'
    ) as starts_at,
    r.modalidad
  from demo_students s
  join oltp_resiliencia.terapeuta t
    on t.codigo_terapeuta = case
      when mod(s.n, 3) = 0 then 'DEMO-TER-03'
      when mod(s.n, 3) = 1 then 'DEMO-TER-01'
      else 'DEMO-TER-02'
    end
  join oltp_resiliencia.sala_terapia r
    on r.codigo_sala = case when mod(s.n, 2) = 0 then 'DEMO-SALA-03' else 'DEMO-SALA-01' end
)
insert into oltp_resiliencia.sesion_terapia
  (id_estudiante, id_terapeuta, id_sala, inicio, fin, estado, modalidad)
select
  sr.id_estudiante, sr.id_terapeuta, sr.id_sala, sr.starts_at, null, 'Programada', sr.modalidad
from session_rows sr
where not exists (
  select 1
  from oltp_resiliencia.sesion_terapia existing
  where existing.id_estudiante = sr.id_estudiante
    and existing.id_terapeuta = sr.id_terapeuta
    and existing.inicio = sr.starts_at
);

-- 9. Refresca las 8 dimensiones y los cuatro hechos desde el OLTP.
call datamart_resiliencia.sp_refresh_datamart();

commit;

-- 10. Resumen de control: los conteos deben coincidir con el objetivo.
select
  (select count(*) from oltp_resiliencia.estudiante where codigo_universitario like 'DEMO-%') as estudiantes_demo,
  (select count(*) from oltp_resiliencia.terapeuta where codigo_terapeuta like 'DEMO-%') as terapeutas_demo,
  (select count(*) from oltp_resiliencia.evaluacion_clinica e
    join oltp_resiliencia.estudiante s using (id_estudiante)
    where s.codigo_universitario like 'DEMO-%') as evaluaciones_demo,
  (select count(*) from oltp_resiliencia.registro_habito h
    join oltp_resiliencia.estudiante s using (id_estudiante)
    where s.codigo_universitario like 'DEMO-%') as registros_habitos_demo,
  (select count(*) from oltp_resiliencia.meta_personal m
    join oltp_resiliencia.estudiante s using (id_estudiante)
    where s.codigo_universitario like 'DEMO-%') as metas_demo,
  (select count(*) from oltp_resiliencia.registro_meta rm
    join oltp_resiliencia.meta_personal m using (id_meta)
    join oltp_resiliencia.estudiante s using (id_estudiante)
    where s.codigo_universitario like 'DEMO-%') as estados_metas_demo,
  (select count(*) from oltp_resiliencia.evaluacion_red_apoyo er
    join oltp_resiliencia.estudiante s using (id_estudiante)
    where s.codigo_universitario like 'DEMO-%') as evaluaciones_red_demo,
  (select count(*) from oltp_resiliencia.sesion_terapia se
    join oltp_resiliencia.estudiante s using (id_estudiante)
    where s.codigo_universitario like 'DEMO-%') as sesiones_demo;
