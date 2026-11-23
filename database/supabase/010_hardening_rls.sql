
/*
  RESILIAUNT — endurecimiento de funciones internas y políticas RLS.
  Los helpers SECURITY DEFINER salen de public para que no sean RPC del Data API.
  resilia_private NO debe agregarse a Exposed schemas.
*/

create schema if not exists resilia_private;
revoke all on schema resilia_private from public, anon, authenticated;
grant usage on schema resilia_private to authenticated;

alter function public.crear_perfil_pendiente() set schema resilia_private;
alter function public.es_administrador() set schema resilia_private;
alter function public.puede_gestionar_estudiante(bigint) set schema resilia_private;
alter function public.puede_gestionar_registro_clinico(bigint, bigint) set schema resilia_private;
alter function public.puede_ver_asignacion(bigint) set schema resilia_private;
alter function public.puede_ver_estudiante(bigint) set schema resilia_private;
alter function public.puede_ver_estudiante_key(bigint) set schema resilia_private;

create or replace function resilia_private.puede_gestionar_registro_clinico(
  p_id_estudiante bigint,
  p_id_terapeuta bigint
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles_app p
    where p.id = auth.uid()
      and (
        p.rol = 'administrador'
        or (
          p.rol = 'terapeuta'
          and p.id_terapeuta = p_id_terapeuta
          and resilia_private.puede_ver_estudiante(p_id_estudiante)
        )
      )
  );
$$;

create or replace function resilia_private.puede_ver_estudiante_key(p_estudiante_key bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select resilia_private.puede_ver_estudiante(d.id_estudiante_oltp)
    from datamart_resiliencia.dim_estudiante d
    where d.estudiante_key = p_estudiante_key
      and d.id_estudiante_oltp is not null
  ), false)
  or exists (
    select 1 from public.perfiles_app p
    where p.id = auth.uid() and p.rol = 'administrador'
  );
$$;

revoke all on function resilia_private.crear_perfil_pendiente() from public, anon, authenticated;
revoke all on function resilia_private.es_administrador() from public, anon;
revoke all on function resilia_private.puede_gestionar_estudiante(bigint) from public, anon;
revoke all on function resilia_private.puede_gestionar_registro_clinico(bigint, bigint) from public, anon;
revoke all on function resilia_private.puede_ver_asignacion(bigint) from public, anon;
revoke all on function resilia_private.puede_ver_estudiante(bigint) from public, anon;
revoke all on function resilia_private.puede_ver_estudiante_key(bigint) from public, anon;

grant execute on function resilia_private.es_administrador() to authenticated;
grant execute on function resilia_private.puede_gestionar_estudiante(bigint) to authenticated;
grant execute on function resilia_private.puede_gestionar_registro_clinico(bigint, bigint) to authenticated;
grant execute on function resilia_private.puede_ver_asignacion(bigint) to authenticated;
grant execute on function resilia_private.puede_ver_estudiante(bigint) to authenticated;
grant execute on function resilia_private.puede_ver_estudiante_key(bigint) to authenticated;

alter procedure datamart_resiliencia.sp_refresh_datamart() set search_path = '';

-- La consulta de perfil no necesita reevaluar auth.uid() por cada fila.
drop policy if exists perfiles_select_own_or_admin on public.perfiles_app;
create policy perfiles_select_own_or_admin on public.perfiles_app
for select to authenticated
using (id = (select auth.uid()) or resilia_private.es_administrador());

-- SELECT permanece separado para lectura propia/alcance profesional.
-- INSERT y UPDATE quedan limitados a los responsables autorizados; no se habilita DELETE.
drop policy if exists sesiones_manage_scope on oltp_resiliencia.sesion_terapia;
create policy sesiones_insert_scope on oltp_resiliencia.sesion_terapia
for insert to authenticated
with check (resilia_private.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta));
create policy sesiones_update_scope on oltp_resiliencia.sesion_terapia
for update to authenticated
using (resilia_private.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta))
with check (resilia_private.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta));

drop policy if exists evaluaciones_manage_scope on oltp_resiliencia.evaluacion_clinica;
create policy evaluaciones_insert_scope on oltp_resiliencia.evaluacion_clinica
for insert to authenticated
with check (resilia_private.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta));
create policy evaluaciones_update_scope on oltp_resiliencia.evaluacion_clinica
for update to authenticated
using (resilia_private.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta))
with check (resilia_private.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta));

drop policy if exists habitos_manage_own on oltp_resiliencia.registro_habito;
create policy habitos_insert_own on oltp_resiliencia.registro_habito
for insert to authenticated
with check (resilia_private.puede_gestionar_estudiante(id_estudiante));
create policy habitos_update_own on oltp_resiliencia.registro_habito
for update to authenticated
using (resilia_private.puede_gestionar_estudiante(id_estudiante))
with check (resilia_private.puede_gestionar_estudiante(id_estudiante));

drop policy if exists metas_manage_own on oltp_resiliencia.meta_personal;
create policy metas_insert_own on oltp_resiliencia.meta_personal
for insert to authenticated
with check (resilia_private.puede_gestionar_estudiante(id_estudiante));
create policy metas_update_own on oltp_resiliencia.meta_personal
for update to authenticated
using (resilia_private.puede_gestionar_estudiante(id_estudiante))
with check (resilia_private.puede_gestionar_estudiante(id_estudiante));

drop policy if exists registros_meta_manage_own on oltp_resiliencia.registro_meta;
create policy registros_meta_insert_own on oltp_resiliencia.registro_meta
for insert to authenticated
with check (
  exists (
    select 1 from oltp_resiliencia.meta_personal m
    where m.id_meta = registro_meta.id_meta
      and resilia_private.puede_gestionar_estudiante(m.id_estudiante)
  )
);
create policy registros_meta_update_own on oltp_resiliencia.registro_meta
for update to authenticated
using (
  exists (
    select 1 from oltp_resiliencia.meta_personal m
    where m.id_meta = registro_meta.id_meta
      and resilia_private.puede_gestionar_estudiante(m.id_estudiante)
  )
)
with check (
  exists (
    select 1 from oltp_resiliencia.meta_personal m
    where m.id_meta = registro_meta.id_meta
      and resilia_private.puede_gestionar_estudiante(m.id_estudiante)
  )
);

drop policy if exists red_apoyo_manage_scope on oltp_resiliencia.evaluacion_red_apoyo;
create policy red_apoyo_insert_scope on oltp_resiliencia.evaluacion_red_apoyo
for insert to authenticated
with check (resilia_private.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta));
create policy red_apoyo_update_scope on oltp_resiliencia.evaluacion_red_apoyo
for update to authenticated
using (resilia_private.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta))
with check (resilia_private.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta));

