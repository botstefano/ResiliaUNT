
drop policy if exists chatbot_alertas_select_therapist on public.chatbot_alertas;
create policy chatbot_alertas_select_therapist
on public.chatbot_alertas for select to authenticated
using (
  exists (
    select 1 from public.perfiles_app p
    where p.id = (select auth.uid())
      and (
        p.rol = 'administrador'
        or (
          p.rol = 'terapeuta'
          and p.id_terapeuta = chatbot_alertas.id_terapeuta
          and exists (
            select 1 from oltp_resiliencia.terapeuta_estudiante te
            where te.id_terapeuta = p.id_terapeuta
              and te.id_estudiante = chatbot_alertas.id_estudiante
              and te.activo = true
              and te.fecha_inicio <= (now() at time zone 'America/Lima')::date
              and (te.fecha_fin is null or te.fecha_fin >= (now() at time zone 'America/Lima')::date)
          )
        )
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
        or (
          p.rol = 'terapeuta'
          and p.id_terapeuta = chatbot_alertas.id_terapeuta
          and exists (
            select 1 from oltp_resiliencia.terapeuta_estudiante te
            where te.id_terapeuta = p.id_terapeuta
              and te.id_estudiante = chatbot_alertas.id_estudiante
              and te.activo = true
              and te.fecha_inicio <= (now() at time zone 'America/Lima')::date
              and (te.fecha_fin is null or te.fecha_fin >= (now() at time zone 'America/Lima')::date)
          )
        )
      )
  )
)
with check (
  exists (
    select 1 from public.perfiles_app p
    where p.id = (select auth.uid())
      and (
        p.rol = 'administrador'
        or (
          p.rol = 'terapeuta'
          and p.id_terapeuta = chatbot_alertas.id_terapeuta
          and exists (
            select 1 from oltp_resiliencia.terapeuta_estudiante te
            where te.id_terapeuta = p.id_terapeuta
              and te.id_estudiante = chatbot_alertas.id_estudiante
              and te.activo = true
              and te.fecha_inicio <= (now() at time zone 'America/Lima')::date
              and (te.fecha_fin is null or te.fecha_fin >= (now() at time zone 'America/Lima')::date)
          )
        )
      )
  )
);
