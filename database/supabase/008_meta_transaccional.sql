/*
  RESILIAUNT — creación atómica de metas personales.
  Ejecutar después de 001_oltp.sql, 003_security_rls.sql y 007_permisos_escritura_api.sql.
  SECURITY INVOKER conserva las políticas RLS del usuario autenticado.
*/

create or replace function public.crear_meta_personal_resilia(
  p_categoria text,
  p_descripcion text,
  p_fecha_objetivo date,
  p_fecha_estado date
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id_estudiante bigint;
  v_id_meta bigint;
begin
  select p.id_estudiante
    into v_id_estudiante
  from public.perfiles_app p
  where p.id = auth.uid()
    and p.rol = 'estudiante';

  if v_id_estudiante is null then
    raise exception 'El usuario no tiene un perfil de estudiante habilitado.'
      using errcode = '42501';
  end if;

  if p_fecha_objetivo is not null and p_fecha_objetivo < p_fecha_estado then
    raise exception 'La fecha objetivo no puede ser anterior a la fecha de registro.'
      using errcode = '22007';
  end if;

  insert into oltp_resiliencia.meta_personal
    (id_estudiante, categoria, descripcion, fecha_creacion, fecha_objetivo)
  values
    (v_id_estudiante, trim(p_categoria), trim(p_descripcion), p_fecha_estado, p_fecha_objetivo)
  returning id_meta into v_id_meta;

  insert into oltp_resiliencia.registro_meta (id_meta, fecha, estado)
  values (v_id_meta, p_fecha_estado, 'Pendiente');

  return v_id_meta;
end;
$$;

revoke all on function public.crear_meta_personal_resilia(text, text, date, date) from public, anon;
grant execute on function public.crear_meta_personal_resilia(text, text, date, date) to authenticated;
