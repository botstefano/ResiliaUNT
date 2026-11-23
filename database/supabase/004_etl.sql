/*
  RESILIAUNT — ETL incremental para dimensiones + refresco transaccional de hechos.
  Ejecutar después de 001 y 002. Puede volver a ejecutarse sin duplicar dimensiones.
  El procedimiento refresca las tablas de hechos usando TRUNCATE + INSERT en una llamada.
*/

create or replace procedure datamart_resiliencia.sp_refresh_datamart()
language plpgsql
as $$
begin
  -- 1. Dimensión tiempo: toma fechas de TODAS las tablas de origen con fecha.
  with fechas as (
    select fecha from oltp_resiliencia.evaluacion_clinica
    union
    select fecha from oltp_resiliencia.registro_habito
    union
    select fecha from oltp_resiliencia.registro_meta
    union
    select fecha from oltp_resiliencia.evaluacion_red_apoyo
    union
    select (inicio at time zone 'America/Lima')::date as fecha from oltp_resiliencia.sesion_terapia
  )
  insert into datamart_resiliencia.dim_tiempo
    (tiempo_key, fecha, dia, mes, nombre_mes, trimestre, anio)
  select distinct
    to_char(f.fecha, 'YYYYMMDD')::integer,
    f.fecha,
    extract(day from f.fecha)::smallint,
    extract(month from f.fecha)::smallint,
    to_char(f.fecha, 'TMMonth'),
    extract(quarter from f.fecha)::smallint,
    extract(year from f.fecha)::smallint
  from fechas f
  where f.fecha is not null
  on conflict (tiempo_key) do update set
    fecha = excluded.fecha,
    dia = excluded.dia,
    mes = excluded.mes,
    nombre_mes = excluded.nombre_mes,
    trimestre = excluded.trimestre,
    anio = excluded.anio;

  -- 2. Dimensiones descriptivas (UPSERT por clave natural).
  insert into datamart_resiliencia.dim_estudiante
    (id_estudiante_oltp, codigo_universitario, carrera, ciclo_academico, turno)
  select id_estudiante, codigo_universitario, carrera, ciclo_academico, turno
  from oltp_resiliencia.estudiante
  on conflict (id_estudiante_oltp) do update set
    codigo_universitario = excluded.codigo_universitario,
    carrera = excluded.carrera,
    ciclo_academico = excluded.ciclo_academico,
    turno = excluded.turno;

  insert into datamart_resiliencia.dim_terapeuta (codigo_terapeuta, nombre, especialidad)
  select codigo_terapeuta, nombre, especialidad
  from oltp_resiliencia.terapeuta
  on conflict (codigo_terapeuta) do update set
    nombre = excluded.nombre,
    especialidad = excluded.especialidad;

  insert into datamart_resiliencia.dim_sala_terapia (codigo_sala, nombre_sala, pabellon, modalidad)
  select codigo_sala, nombre_sala, pabellon, modalidad
  from oltp_resiliencia.sala_terapia
  on conflict (codigo_sala) do update set
    nombre_sala = excluded.nombre_sala,
    pabellon = excluded.pabellon,
    modalidad = excluded.modalidad;

  insert into datamart_resiliencia.dim_habito (codigo_habito, nombre, categoria)
  select codigo_habito, nombre, categoria
  from oltp_resiliencia.habito
  on conflict (codigo_habito) do update set
    nombre = excluded.nombre,
    categoria = excluded.categoria;

  insert into datamart_resiliencia.dim_intensidad (nivel)
  values ('Alta'), ('Media'), ('Baja')
  on conflict (nivel) do nothing;

  insert into datamart_resiliencia.dim_meta_categoria (categoria)
  select distinct categoria from oltp_resiliencia.meta_personal
  on conflict (categoria) do nothing;

  insert into datamart_resiliencia.dim_red_apoyo (red_apoyo_activa, estado)
  values (true, 'Activa'), (false, 'No activa')
  on conflict (red_apoyo_activa) do update set estado = excluded.estado;

  -- Las secuencias quedan listas incluso si se agregaron claves manuales.
  perform setval(pg_get_serial_sequence('datamart_resiliencia.dim_estudiante','estudiante_key'),
    greatest(coalesce((select max(estudiante_key) from datamart_resiliencia.dim_estudiante), 0), 0), true);
  perform setval(pg_get_serial_sequence('datamart_resiliencia.dim_terapeuta','terapeuta_key'),
    greatest(coalesce((select max(terapeuta_key) from datamart_resiliencia.dim_terapeuta), 0), 0), true);
  perform setval(pg_get_serial_sequence('datamart_resiliencia.dim_sala_terapia','sala_key'),
    greatest(coalesce((select max(sala_key) from datamart_resiliencia.dim_sala_terapia), 0), 0), true);
  perform setval(pg_get_serial_sequence('datamart_resiliencia.dim_habito','habito_key'),
    greatest(coalesce((select max(habito_key) from datamart_resiliencia.dim_habito), 0), 0), true);
  perform setval(pg_get_serial_sequence('datamart_resiliencia.dim_intensidad','intensidad_key'),
    greatest(coalesce((select max(intensidad_key) from datamart_resiliencia.dim_intensidad), 0), 0), true);
  perform setval(pg_get_serial_sequence('datamart_resiliencia.dim_meta_categoria','meta_key'),
    greatest(coalesce((select max(meta_key) from datamart_resiliencia.dim_meta_categoria), 0), 0), true);
  perform setval(pg_get_serial_sequence('datamart_resiliencia.dim_red_apoyo','red_key'),
    greatest(coalesce((select max(red_key) from datamart_resiliencia.dim_red_apoyo), 0), 0), true);

  -- 3. Refresco íntegro de hechos. Si una inserción falla, la llamada se revierte.
  truncate table
    datamart_resiliencia.fact_evaluacion_clinica,
    datamart_resiliencia.fact_registro_habitos,
    datamart_resiliencia.fact_seguimiento_meta,
    datamart_resiliencia.fact_red_apoyo
  restart identity;

  insert into datamart_resiliencia.fact_evaluacion_clinica
    (fuente_evaluacion_id, tiempo_key, estudiante_key, terapeuta_key, sala_key,
     indice_resiliencia, pensamientos_intrusivos, periodo_referencia_dias, cantidad_sesiones)
  select
    e.id_evaluacion,
    to_char(e.fecha, 'YYYYMMDD')::integer,
    de.estudiante_key,
    dt.terapeuta_key,
    coalesce(ds.sala_key, 0),
    e.indice_resiliencia,
    e.pensamientos_intrusivos,
    e.periodo_referencia_dias,
    e.cantidad_sesiones
  from oltp_resiliencia.evaluacion_clinica e
  join datamart_resiliencia.dim_estudiante de on de.id_estudiante_oltp = e.id_estudiante
  join datamart_resiliencia.dim_terapeuta dt
    on dt.codigo_terapeuta = (select t.codigo_terapeuta from oltp_resiliencia.terapeuta t where t.id_terapeuta = e.id_terapeuta)
  left join datamart_resiliencia.dim_sala_terapia ds
    on ds.codigo_sala = (select s.codigo_sala from oltp_resiliencia.sala_terapia s where s.id_sala = e.id_sala);

  insert into datamart_resiliencia.fact_registro_habitos
    (fuente_registro_id, tiempo_key, estudiante_key, habito_key, intensidad_key, completado_count)
  select
    r.id_registro_habito,
    to_char(r.fecha, 'YYYYMMDD')::integer,
    de.estudiante_key,
    dh.habito_key,
    di.intensidad_key,
    case when r.completado then 1 else 0 end
  from oltp_resiliencia.registro_habito r
  join datamart_resiliencia.dim_estudiante de on de.id_estudiante_oltp = r.id_estudiante
  join datamart_resiliencia.dim_habito dh
    on dh.codigo_habito = (select h.codigo_habito from oltp_resiliencia.habito h where h.id_habito = r.id_habito)
  join datamart_resiliencia.dim_intensidad di on di.nivel = r.intensidad;

  insert into datamart_resiliencia.fact_seguimiento_meta
    (fuente_registro_meta_id, id_meta_oltp, tiempo_key, estudiante_key, meta_key, metas_cumplidas, metas_pendientes)
  select
    rm.id_registro_meta,
    mp.id_meta,
    to_char(rm.fecha, 'YYYYMMDD')::integer,
    de.estudiante_key,
    dm.meta_key,
    case when rm.estado = 'Cumplida' then 1 else 0 end,
    case when rm.estado = 'Pendiente' then 1 else 0 end
  from oltp_resiliencia.registro_meta rm
  join oltp_resiliencia.meta_personal mp on mp.id_meta = rm.id_meta
  join datamart_resiliencia.dim_estudiante de on de.id_estudiante_oltp = mp.id_estudiante
  join datamart_resiliencia.dim_meta_categoria dm on dm.categoria = mp.categoria;

  insert into datamart_resiliencia.fact_red_apoyo
    (fuente_evaluacion_red_id, tiempo_key, estudiante_key, terapeuta_key, red_key,
     contactos_activos, interacciones_sociales, periodo_referencia_dias)
  select
    er.id_evaluacion_red,
    to_char(er.fecha, 'YYYYMMDD')::integer,
    de.estudiante_key,
    dt.terapeuta_key,
    dr.red_key,
    er.contactos_activos,
    er.interacciones_sociales,
    er.periodo_referencia_dias
  from oltp_resiliencia.evaluacion_red_apoyo er
  join datamart_resiliencia.dim_estudiante de on de.id_estudiante_oltp = er.id_estudiante
  join datamart_resiliencia.dim_terapeuta dt
    on dt.codigo_terapeuta = (select t.codigo_terapeuta from oltp_resiliencia.terapeuta t where t.id_terapeuta = er.id_terapeuta)
  join datamart_resiliencia.dim_red_apoyo dr on dr.red_apoyo_activa = er.red_apoyo_activa;
end;
$$;

-- Ejecutar inmediatamente: en OLTP vacío crea dimensiones y hechos vacíos sin error.
call datamart_resiliencia.sp_refresh_datamart();

-- Wrapper HTTP-RPC para que el backend pueda refrescar el DataMart tras una escritura.
-- Se concede exclusivamente a service_role; no es una función para el navegador.
create or replace function public.refrescar_datamart_resilia()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  call datamart_resiliencia.sp_refresh_datamart();
  return true;
end;
$$;

revoke all on function public.refrescar_datamart_resilia() from public, anon, authenticated;
grant execute on function public.refrescar_datamart_resilia() to service_role;

-- Privilegios de la rutina ETL: la aplicación solo la invoca desde el servidor.
revoke all on procedure datamart_resiliencia.sp_refresh_datamart() from public, anon, authenticated;
grant execute on procedure datamart_resiliencia.sp_refresh_datamart() to service_role;
