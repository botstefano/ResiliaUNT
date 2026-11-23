/*
  RESILIAUNT — avisos operativos de los chatbots.
  No persiste conversaciones, mensajes, notas libres ni contenido clínico.
*/
create table if not exists public.chatbot_alertas (
  id_alerta bigint generated always as identity primary key,
  id_estudiante bigint not null
    references oltp_resiliencia.estudiante(id_estudiante) on delete cascade,
  id_terapeuta bigint not null
    references oltp_resiliencia.terapeuta(id_terapeuta) on delete cascade,
  tipo varchar(30) not null
    check (tipo in ('solicitud_contacto', 'prioridad_seguridad')),
  estado varchar(20) not null default 'pendiente'
    check (estado in ('pendiente', 'atendida')),
  creada_en timestamptz not null default now(),
  atendida_en timestamptz,
  check (
    (estado = 'pendiente' and atendida_en is null)
    or (estado = 'atendida' and atendida_en is not null)
  )
);

create index if not exists ix_chatbot_alertas_terapeuta_pendientes
  on public.chatbot_alertas (id_terapeuta, estado, creada_en desc);
create index if not exists ix_chatbot_alertas_estudiante_recientes
  on public.chatbot_alertas (id_estudiante, tipo, creada_en desc);

comment on table public.chatbot_alertas is
  'Avisos operativos del chatbot. No almacena contenido de conversaciones ni notas clínicas.';

alter table public.chatbot_alertas enable row level security;
revoke all on table public.chatbot_alertas from anon, authenticated;
grant select, update on table public.chatbot_alertas to authenticated;
grant select, insert, update on table public.chatbot_alertas to service_role;
grant usage, select on sequence public.chatbot_alertas_id_alerta_seq to service_role;

drop policy if exists chatbot_alertas_select_therapist on public.chatbot_alertas;
create policy chatbot_alertas_select_therapist
on public.chatbot_alertas for select to authenticated
using (
  exists (
    select 1 from public.perfiles_app p
    where p.id = (select auth.uid())
      and (
        p.rol = 'administrador'
        or (p.rol = 'terapeuta' and p.id_terapeuta = chatbot_alertas.id_terapeuta)
      )
  )
);

drop policy if exists chatbot_alertas_update_therapist on public.chatbot_alertas;
create policy chatbot_alertas_update_therapist
on public.chatbot_alertas for update to authenticated
using (
  exists (
    select 1 from public.perfiles_app p
    where p.id = (select auth.uid())
      and (
        p.rol = 'administrador'
        or (p.rol = 'terapeuta' and p.id_terapeuta = chatbot_alertas.id_terapeuta)
      )
  )
)
with check (
  exists (
    select 1 from public.perfiles_app p
    where p.id = (select auth.uid())
      and (
        p.rol = 'administrador'
        or (p.rol = 'terapeuta' and p.id_terapeuta = chatbot_alertas.id_terapeuta)
      )
  )
);
