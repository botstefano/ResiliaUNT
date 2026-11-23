/*
  RESILIAUNT — validaciones de integridad y KPIs.
  Ejecutar después de poblar OLTP y ejecutar el procedimiento ETL.
*/

-- A. Conteos de origen y DataMart.
select
  (select count(*) from oltp_resiliencia.evaluacion_clinica) as evaluaciones_oltp,
  (select count(*) from datamart_resiliencia.fact_evaluacion_clinica) as evaluaciones_dm,
  (select count(*) from oltp_resiliencia.registro_habito) as habitos_oltp,
  (select count(*) from datamart_resiliencia.fact_registro_habitos) as habitos_dm,
  (select count(*) from oltp_resiliencia.registro_meta) as metas_oltp,
  (select count(*) from datamart_resiliencia.fact_seguimiento_meta) as metas_dm,
  (select count(*) from oltp_resiliencia.evaluacion_red_apoyo) as red_oltp,
  (select count(*) from datamart_resiliencia.fact_red_apoyo) as red_dm;

-- B. Fechas faltantes en Dim_Tiempo (debe devolver cero filas).
with fechas_origen as (
  select fecha from oltp_resiliencia.evaluacion_clinica
  union select fecha from oltp_resiliencia.registro_habito
  union select fecha from oltp_resiliencia.registro_meta
  union select fecha from oltp_resiliencia.evaluacion_red_apoyo
  union select (inicio at time zone 'America/Lima')::date from oltp_resiliencia.sesion_terapia
)
select distinct f.fecha
from fechas_origen f
left join datamart_resiliencia.dim_tiempo d
  on d.tiempo_key = to_char(f.fecha, 'YYYYMMDD')::integer
where d.tiempo_key is null;

-- C. Huérfanos de las ocho relaciones de dimensión (todos deben ser cero).
select
  (select count(*) from datamart_resiliencia.fact_evaluacion_clinica f
    left join datamart_resiliencia.dim_tiempo d using (tiempo_key) where d.tiempo_key is null) as huerfanos_tiempo_eval,
  (select count(*) from datamart_resiliencia.fact_evaluacion_clinica f
    left join datamart_resiliencia.dim_estudiante d using (estudiante_key) where d.estudiante_key is null) as huerfanos_estudiante_eval,
  (select count(*) from datamart_resiliencia.fact_evaluacion_clinica f
    left join datamart_resiliencia.dim_terapeuta d using (terapeuta_key) where d.terapeuta_key is null) as huerfanos_terapeuta,
  (select count(*) from datamart_resiliencia.fact_evaluacion_clinica f
    left join datamart_resiliencia.dim_sala_terapia d using (sala_key) where d.sala_key is null) as huerfanos_sala,
  (select count(*) from datamart_resiliencia.fact_registro_habitos f
    left join datamart_resiliencia.dim_habito d using (habito_key) where d.habito_key is null) as huerfanos_habito,
  (select count(*) from datamart_resiliencia.fact_registro_habitos f
    left join datamart_resiliencia.dim_intensidad d using (intensidad_key) where d.intensidad_key is null) as huerfanos_intensidad,
  (select count(*) from datamart_resiliencia.fact_seguimiento_meta f
    left join datamart_resiliencia.dim_meta_categoria d using (meta_key) where d.meta_key is null) as huerfanos_meta_categoria,
  (select count(*) from datamart_resiliencia.fact_red_apoyo f
    left join datamart_resiliencia.dim_red_apoyo d using (red_key) where d.red_key is null) as huerfanos_red_apoyo,
  (select count(*) from datamart_resiliencia.fact_red_apoyo f
    left join datamart_resiliencia.dim_terapeuta d using (terapeuta_key) where d.terapeuta_key is null) as huerfanos_terapeuta_red;

-- D. Cuatro KPI oficiales del mismo período móvil de 12 meses del portal.
-- El KPI 4 toma la última valoración por estudiante; las evaluaciones repetidas
-- no aumentan el peso de una persona en el numerador ni en el denominador.
with parametros as (
  select
    (date_trunc('month', (now() at time zone 'America/Lima')::date) - interval '11 months')::date as fecha_inicio,
    (now() at time zone 'America/Lima')::date as fecha_fin
),
kpi_clinico as (
  select
    avg(f.indice_resiliencia)::numeric as resiliencia_promedio,
    avg((f.pensamientos_intrusivos::numeric / nullif(f.periodo_referencia_dias, 0)) * 30)
      as pensamientos_intrusivos_por_30_dias
  from datamart_resiliencia.fact_evaluacion_clinica f
  join datamart_resiliencia.dim_tiempo t using (tiempo_key)
  cross join parametros p
  where t.fecha between p.fecha_inicio and p.fecha_fin
),
ultimo_estado_meta as (
  select distinct on (f.id_meta_oltp)
    f.id_meta_oltp, f.metas_cumplidas, f.metas_pendientes
  from datamart_resiliencia.fact_seguimiento_meta f
  join datamart_resiliencia.dim_tiempo t using (tiempo_key)
  cross join parametros p
  where t.fecha between p.fecha_inicio and p.fecha_fin
  order by f.id_meta_oltp, f.tiempo_key desc, f.seguimiento_key desc
),
kpi_metas as (
  select
    100.0 * count(*) filter (where metas_cumplidas = 1)::numeric /
      nullif(count(*), 0) as cumplimiento_metas_pct
  from ultimo_estado_meta
),
ultima_red_por_estudiante as (
  select distinct on (f.estudiante_key)
    f.estudiante_key, f.red_key, f.contactos_activos, f.interacciones_sociales,
    f.tiempo_key, f.red_apoyo_fact_key
  from datamart_resiliencia.fact_red_apoyo f
  join datamart_resiliencia.dim_tiempo t using (tiempo_key)
  cross join parametros p
  where t.fecha between p.fecha_inicio and p.fecha_fin
  order by f.estudiante_key, f.tiempo_key desc, f.red_apoyo_fact_key desc
),
kpi_red as (
  select
    100.0 * count(*) filter (where d.red_apoyo_activa is true)::numeric /
      nullif(count(*), 0) as red_apoyo_activa_pct,
    avg(u.contactos_activos)::numeric as contactos_activos_promedio,
    avg(u.interacciones_sociales)::numeric as interacciones_promedio,
    count(*) as estudiantes_con_valoracion_red
  from ultima_red_por_estudiante u
  join datamart_resiliencia.dim_red_apoyo d using (red_key)
)
select
  round(k.resiliencia_promedio, 2) as kpi_1_resiliencia_promedio,
  round(k.pensamientos_intrusivos_por_30_dias, 2) as kpi_2_intrusivos_por_30_dias,
  round(m.cumplimiento_metas_pct, 2) as kpi_3_cumplimiento_metas_pct,
  round(r.red_apoyo_activa_pct, 2) as kpi_4_red_apoyo_activa_pct,
  round(r.contactos_activos_promedio, 2) as contactos_activos_promedio,
  round(r.interacciones_promedio, 2) as interacciones_sociales_promedio,
  r.estudiantes_con_valoracion_red
from kpi_clinico k
cross join kpi_metas m
cross join kpi_red r;

-- E. Seguimiento por ciclo: solo evaluaciones clínicas, sin multiplicar filas.
select
  de.ciclo_academico,
  count(distinct f.estudiante_key) as estudiantes_con_evaluacion,
  round(avg(f.indice_resiliencia), 2) as resiliencia_promedio,
  round(avg((f.pensamientos_intrusivos::numeric / nullif(f.periodo_referencia_dias, 0)) * 30), 2)
    as intrusivos_promedio_por_30_dias
from datamart_resiliencia.fact_evaluacion_clinica f
join datamart_resiliencia.dim_estudiante de using (estudiante_key)
group by de.ciclo_academico
order by de.ciclo_academico;

-- F. Hábitos vs evaluaciones: primero agrega cada lado a estudiante-año-mes.
-- Esta consulta es exploratoria/descriptiva; no demuestra causalidad.
with habitos_mes as (
  select
    f.estudiante_key,
    t.anio,
    t.mes,
    h.nombre as habito,
    sum(f.completado_count) as dias_completados
  from datamart_resiliencia.fact_registro_habitos f
  join datamart_resiliencia.dim_tiempo t using (tiempo_key)
  join datamart_resiliencia.dim_habito h using (habito_key)
  group by f.estudiante_key, t.anio, t.mes, h.nombre
),
evaluaciones_mes as (
  select
    f.estudiante_key,
    t.anio,
    t.mes,
    avg((f.pensamientos_intrusivos::numeric / nullif(f.periodo_referencia_dias, 0)) * 30)
      as intrusivos_por_30_dias
  from datamart_resiliencia.fact_evaluacion_clinica f
  join datamart_resiliencia.dim_tiempo t using (tiempo_key)
  group by f.estudiante_key, t.anio, t.mes
)
select
  h.habito,
  sum(h.dias_completados) as dias_completados,
  round(avg(e.intrusivos_por_30_dias), 2) as intrusivos_promedio_asociado
from habitos_mes h
join evaluaciones_mes e
  on e.estudiante_key = h.estudiante_key
  and e.anio = h.anio
  and e.mes = h.mes
group by h.habito
order by h.habito;
