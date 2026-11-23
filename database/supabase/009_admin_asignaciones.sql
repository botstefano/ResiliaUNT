/*
  RESILIAUNT — historial de asignaciones y permisos mínimos del panel administrativo.
  Ejecutar después de 001_oltp.sql y 003_security_rls.sql.
*/

-- Permite conservar varios períodos históricos con la misma pareja terapeuta-estudiante,
-- pero impide que existan dos relaciones activas simultáneamente.
alter table oltp_resiliencia.terapeuta_estudiante
  drop constraint if exists terapeuta_estudiante_id_terapeuta_id_estudiante_key;

create unique index if not exists ux_terapeuta_estudiante_activa
  on oltp_resiliencia.terapeuta_estudiante (id_terapeuta, id_estudiante)
  where activo = true;

-- El backend usa service_role únicamente después de comprobar el rol administrador
-- mediante la sesión autenticada. Nunca se expone esta clave al navegador.
grant select, update on public.perfiles_app to service_role;
