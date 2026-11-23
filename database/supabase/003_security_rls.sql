/*
  RESILIAUNT — perfiles, autorización y RLS.
  Ejecutar después de 001_oltp.sql y 002_datamart.sql.
  RLS se aplica antes de habilitar acceso desde la aplicación.
*/

create table if not exists public.perfiles_app (
  id uuid primary key references auth.users(id) on delete cascade,
  rol varchar(20) not null default 'pendiente'
    check (rol in ('pendiente', 'estudiante', 'terapeuta', 'administrador')),
  id_estudiante bigint unique references oltp_resiliencia.estudiante(id_estudiante),
  id_terapeuta bigint unique references oltp_resiliencia.terapeuta(id_terapeuta),
  nombre_visible varchar(150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (rol = 'estudiante' and id_estudiante is not null and id_terapeuta is null)
    or (rol = 'terapeuta' and id_terapeuta is not null and id_estudiante is null)
    or (rol in ('pendiente', 'administrador') and id_estudiante is null and id_terapeuta is null)
  )
);

create or replace function public.actualizar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_perfiles_updated_at on public.perfiles_app;
create trigger trg_perfiles_updated_at
before update on public.perfiles_app
for each row execute function public.actualizar_updated_at();

create or replace function public.crear_perfil_pendiente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles_app (id, rol, nombre_visible)
  values (new.id, 'pendiente', null)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.crear_perfil_pendiente();

create or replace function public.puede_ver_estudiante(p_id_estudiante bigint)
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
        or (p.rol = 'estudiante' and p.id_estudiante = p_id_estudiante)
        or (
          p.rol = 'terapeuta'
          and exists (
            select 1 from oltp_resiliencia.terapeuta_estudiante te
            where te.id_terapeuta = p.id_terapeuta
              and te.id_estudiante = p_id_estudiante
              and te.activo = true
              and te.fecha_inicio <= (now() at time zone 'America/Lima')::date
              and (te.fecha_fin is null or te.fecha_fin >= (now() at time zone 'America/Lima')::date)
          )
        )
      )
  );
$$;


create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles_app p
    where p.id = auth.uid() and p.rol = 'administrador'
  );
$$;

create or replace function public.puede_ver_asignacion(p_id_terapeuta bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles_app p
    where p.id = auth.uid()
      and (p.rol = 'administrador' or (p.rol = 'terapeuta' and p.id_terapeuta = p_id_terapeuta))
  );
$$;

create or replace function public.puede_gestionar_registro_clinico(
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
        or (p.rol = 'terapeuta' and p.id_terapeuta = p_id_terapeuta
            and public.puede_ver_estudiante(p_id_estudiante))
      )
  );
$$;

create or replace function public.puede_gestionar_estudiante(p_id_estudiante bigint)
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
        or (p.rol = 'estudiante' and p.id_estudiante = p_id_estudiante)
      )
  );
$$;

create or replace function public.puede_ver_estudiante_key(p_estudiante_key bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select public.puede_ver_estudiante(d.id_estudiante_oltp)
    from datamart_resiliencia.dim_estudiante d
    where d.estudiante_key = p_estudiante_key
      and d.id_estudiante_oltp is not null
  ), false)
  or exists (
    select 1 from public.perfiles_app p
    where p.id = auth.uid() and p.rol = 'administrador'
  );
$$;

-- Perfil: cada usuario únicamente consulta su propio perfil. El primer administrador
-- se habilita una sola vez por el propietario del proyecto; después se usa /portal/admin.
alter table public.perfiles_app enable row level security;
drop policy if exists perfiles_select_own_or_admin on public.perfiles_app;
create policy perfiles_select_own_or_admin on public.perfiles_app
for select to authenticated
using (id = auth.uid() or public.es_administrador());
revoke update, delete on public.perfiles_app from authenticated;
grant select on public.perfiles_app to authenticated;

-- RLS para OLTP.
do $$
declare t text;
begin
  foreach t in array array[
    'estudiante','terapeuta','sala_terapia','terapeuta_estudiante','sesion_terapia',
    'evaluacion_clinica','habito','registro_habito','meta_personal','registro_meta','evaluacion_red_apoyo'
  ] loop
    execute format('alter table oltp_resiliencia.%I enable row level security', t);
  end loop;
end $$;

-- Catálogos visibles solo para usuarios autenticados.
drop policy if exists catalogos_select_auth on oltp_resiliencia.terapeuta;
create policy catalogos_select_auth on oltp_resiliencia.terapeuta
for select to authenticated using (true);
drop policy if exists salas_select_auth on oltp_resiliencia.sala_terapia;
create policy salas_select_auth on oltp_resiliencia.sala_terapia
for select to authenticated using (true);
drop policy if exists habitos_select_auth on oltp_resiliencia.habito;
create policy habitos_select_auth on oltp_resiliencia.habito
for select to authenticated using (true);

-- Estudiantes: solo el propio estudiante, su terapeuta asignado o administrador.
drop policy if exists estudiante_select_scope on oltp_resiliencia.estudiante;
create policy estudiante_select_scope on oltp_resiliencia.estudiante
for select to authenticated using (public.puede_ver_estudiante(id_estudiante));

-- Relación terapeuta-estudiante: solo el terapeuta participante o administrador.
drop policy if exists asignacion_select_scope on oltp_resiliencia.terapeuta_estudiante;
create policy asignacion_select_scope on oltp_resiliencia.terapeuta_estudiante
for select to authenticated using (public.puede_ver_asignacion(id_terapeuta));

-- Sesiones: lectura del estudiante y del terapeuta asignado; gestión por terapeuta/admin.
drop policy if exists sesiones_select_scope on oltp_resiliencia.sesion_terapia;
create policy sesiones_select_scope on oltp_resiliencia.sesion_terapia
for select to authenticated using (public.puede_ver_estudiante(id_estudiante));
drop policy if exists sesiones_manage_scope on oltp_resiliencia.sesion_terapia;
create policy sesiones_manage_scope on oltp_resiliencia.sesion_terapia
for all to authenticated using (public.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta))
with check (public.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta));

-- Evaluaciones clínicas: el estudiante ve las propias; solo profesional/admin puede gestionarlas.
drop policy if exists evaluaciones_select_scope on oltp_resiliencia.evaluacion_clinica;
create policy evaluaciones_select_scope on oltp_resiliencia.evaluacion_clinica
for select to authenticated using (public.puede_ver_estudiante(id_estudiante));
drop policy if exists evaluaciones_manage_scope on oltp_resiliencia.evaluacion_clinica;
create policy evaluaciones_manage_scope on oltp_resiliencia.evaluacion_clinica
for all to authenticated using (public.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta))
with check (public.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta));

-- Los estudiantes administran sus registros cotidianos; el terapeuta asignado los consulta.
drop policy if exists habitos_select_scope on oltp_resiliencia.registro_habito;
create policy habitos_select_scope on oltp_resiliencia.registro_habito
for select to authenticated using (public.puede_ver_estudiante(id_estudiante));
drop policy if exists habitos_manage_own on oltp_resiliencia.registro_habito;
create policy habitos_manage_own on oltp_resiliencia.registro_habito
for all to authenticated using (public.puede_gestionar_estudiante(id_estudiante))
with check (public.puede_gestionar_estudiante(id_estudiante));

drop policy if exists metas_select_scope on oltp_resiliencia.meta_personal;
create policy metas_select_scope on oltp_resiliencia.meta_personal
for select to authenticated using (public.puede_ver_estudiante(id_estudiante));
drop policy if exists metas_manage_own on oltp_resiliencia.meta_personal;
create policy metas_manage_own on oltp_resiliencia.meta_personal
for all to authenticated using (public.puede_gestionar_estudiante(id_estudiante))
with check (public.puede_gestionar_estudiante(id_estudiante));

drop policy if exists registros_meta_select_scope on oltp_resiliencia.registro_meta;
create policy registros_meta_select_scope on oltp_resiliencia.registro_meta
for select to authenticated using (
  exists (select 1 from oltp_resiliencia.meta_personal m
    where m.id_meta = registro_meta.id_meta and public.puede_ver_estudiante(m.id_estudiante))
);
drop policy if exists registros_meta_manage_own on oltp_resiliencia.registro_meta;
create policy registros_meta_manage_own on oltp_resiliencia.registro_meta
for all to authenticated using (
  exists (select 1 from oltp_resiliencia.meta_personal m
    where m.id_meta = registro_meta.id_meta and public.puede_gestionar_estudiante(m.id_estudiante))
) with check (
  exists (select 1 from oltp_resiliencia.meta_personal m
    where m.id_meta = registro_meta.id_meta and public.puede_gestionar_estudiante(m.id_estudiante))
);

drop policy if exists red_apoyo_select_scope on oltp_resiliencia.evaluacion_red_apoyo;
create policy red_apoyo_select_scope on oltp_resiliencia.evaluacion_red_apoyo
for select to authenticated using (public.puede_ver_estudiante(id_estudiante));
drop policy if exists red_apoyo_manage_own on oltp_resiliencia.evaluacion_red_apoyo;
drop policy if exists red_apoyo_manage_scope on oltp_resiliencia.evaluacion_red_apoyo;
create policy red_apoyo_manage_scope on oltp_resiliencia.evaluacion_red_apoyo
for all to authenticated using (public.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta))
with check (public.puede_gestionar_registro_clinico(id_estudiante, id_terapeuta));

-- Acceso a los dos esquemas desde PostgREST: agregarlos también a API > Exposed schemas
-- en Supabase. RLS sigue siendo obligatorio aunque el esquema esté expuesto.
grant usage on schema oltp_resiliencia, datamart_resiliencia to authenticated;
grant select on all tables in schema oltp_resiliencia to authenticated;
grant insert, update on oltp_resiliencia.registro_habito,
  oltp_resiliencia.meta_personal, oltp_resiliencia.registro_meta,
  oltp_resiliencia.evaluacion_red_apoyo to authenticated;
grant select on all tables in schema datamart_resiliencia to authenticated;

-- Las secuencias solo son necesarias para inserciones en tablas OLTP permitidas.
grant usage, select on all sequences in schema oltp_resiliencia to authenticated;

-- Funciones auxiliares: ejecución para usuarios autenticados.
revoke all on function public.es_administrador() from public;
revoke all on function public.puede_ver_asignacion(bigint) from public;
revoke all on function public.puede_gestionar_registro_clinico(bigint,bigint) from public;
revoke all on function public.puede_ver_estudiante(bigint) from public;
revoke all on function public.puede_gestionar_estudiante(bigint) from public;
revoke all on function public.puede_ver_estudiante_key(bigint) from public;
grant execute on function public.es_administrador() to authenticated;
grant execute on function public.puede_ver_asignacion(bigint) to authenticated;
grant execute on function public.puede_gestionar_registro_clinico(bigint,bigint) to authenticated;
grant execute on function public.puede_ver_estudiante(bigint) to authenticated;
grant execute on function public.puede_gestionar_estudiante(bigint) to authenticated;
grant execute on function public.puede_ver_estudiante_key(bigint) to authenticated;

-- RLS del DataMart: las dimensiones comunes se pueden leer; la dimensión estudiante
-- y las cuatro tablas de hechos solo muestran estudiantes dentro del ámbito del usuario.
do $$
declare t text;
begin
  foreach t in array array[
    'dim_tiempo','dim_estudiante','dim_terapeuta','dim_sala_terapia','dim_habito',
    'dim_intensidad','dim_meta_categoria','dim_red_apoyo',
    'fact_evaluacion_clinica','fact_registro_habitos','fact_seguimiento_meta','fact_red_apoyo'
  ] loop
    execute format('alter table datamart_resiliencia.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists datamart_common_dimensions_select on datamart_resiliencia.dim_tiempo;
create policy datamart_common_dimensions_select on datamart_resiliencia.dim_tiempo
for select to authenticated using (true);

drop policy if exists datamart_dim_estudiante_select on datamart_resiliencia.dim_estudiante;
create policy datamart_dim_estudiante_select on datamart_resiliencia.dim_estudiante
for select to authenticated using (
  (id_estudiante_oltp is null and public.es_administrador())
  or public.puede_ver_estudiante(id_estudiante_oltp)
);

do $$
declare t text;
begin
  foreach t in array array[
    'dim_terapeuta','dim_sala_terapia','dim_habito','dim_intensidad','dim_meta_categoria','dim_red_apoyo'
  ] loop
    execute format('drop policy if exists %I on datamart_resiliencia.%I', t || '_select_auth', t);
    execute format('create policy %I on datamart_resiliencia.%I for select to authenticated using (true)', t || '_select_auth', t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'fact_evaluacion_clinica','fact_registro_habitos','fact_seguimiento_meta','fact_red_apoyo'
  ] loop
    execute format('drop policy if exists %I on datamart_resiliencia.%I', t || '_select_scope', t);
    execute format(
      'create policy %I on datamart_resiliencia.%I for select to authenticated using (public.puede_ver_estudiante_key(estudiante_key))',
      t || '_select_scope', t
    );
  end loop;
end $$;

-- El servicio backend puede consultar las tablas con service_role, pero el secreto
-- nunca debe enviarse al navegador. La aplicación comprueba auth.uid() y rol antes
-- de usarlo y aplica la lista de estudiantes autorizados en cada consulta.


-- Permisos explícitos del backend privilegiado. La clave service_role solo existe
-- en el entorno servidor; las rutas API realizan las comprobaciones de usuario,
-- rol y asignación antes de efectuar consultas con esta credencial.
grant usage on schema oltp_resiliencia, datamart_resiliencia to service_role;
grant select, insert, update, delete on all tables in schema oltp_resiliencia to service_role;
grant select, insert, update, delete on all tables in schema datamart_resiliencia to service_role;
grant usage, select on all sequences in schema oltp_resiliencia, datamart_resiliencia to service_role;
