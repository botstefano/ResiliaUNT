# Guía de instalación: Supabase + Render

Esta guía describe la configuración inicial. No contiene credenciales ni reemplaza la revisión institucional previa al uso con personas reales.

## 1. Preparar Supabase

1. Crea un proyecto Supabase dedicado a ResiliaUNT.
2. Abre **SQL Editor** y ejecuta los scripts, en este orden:
   - `database/supabase/001_oltp.sql`
   - `database/supabase/002_datamart.sql`
   - `database/supabase/003_security_rls.sql`
   - `database/supabase/007_permisos_escritura_api.sql`
   - `database/supabase/008_meta_transaccional.sql`
   - `database/supabase/009_admin_asignaciones.sql`
   - `database/supabase/004_etl.sql`
   - `database/supabase/005_seed_demo.sql` solo si se trata de un entorno de demostración.
3. Ejecuta `database/supabase/006_validaciones_kpi.sql` después del ETL para revisar conteos, fechas, relaciones y KPI.
4. En **Project Settings → API → Exposed schemas**, agrega `oltp_resiliencia` y `datamart_resiliencia` junto con `public`. No agregues otros esquemas sin revisar sus permisos.
5. En **Authentication → URL Configuration**, configura el dominio público de Render como Site URL y permite los redirect URLs de desarrollo y producción que permitan el callback y su parámetro `next` (por ejemplo `http://localhost:3000/auth/callback**` y `https://TU-SERVICIO.onrender.com/auth/callback**`). En producción usa exclusivamente HTTPS.
6. Configura la plantilla de correo de recuperación de Supabase Auth y comprueba que su enlace redirija al callback de la aplicación.
7. Mantén el registro público cerrado. Después del primer administrador, invita a los usuarios desde `/portal/admin`; el trigger asigna inicialmente el rol `pendiente`.

## 2. Crear el primer administrador y gestionar accesos

Para el primer administrador, crea o invita la cuenta desde **Supabase → Authentication → Users**. Para las cuentas posteriores, el administrador utilizará la opción **Invitar a un usuario** de `/portal/admin`. El trigger crea automáticamente el perfil con rol `pendiente`.

Solo para habilitar al primer administrador del sistema, el propietario del proyecto debe ejecutar una vez en SQL Editor, sustituyendo el correo de ejemplo por el correo real de la cuenta creada:

```sql
update public.perfiles_app
set rol = 'administrador',
    id_estudiante = null,
    id_terapeuta = null,
    nombre_visible = 'Administración ResiliaUNT'
where id = (
  select id
  from auth.users
  where email = 'CORREO_DEL_PRIMER_ADMINISTRADOR'
);
```

Comprueba que se haya actualizado exactamente una fila y vuelve a iniciar sesión. Después, entra a **/portal/admin**. Desde el panel podrás invitar usuarios por correo, habilitar sus perfiles como estudiante o terapeuta, vincularlos con el registro institucional y asignar/cerrar relaciones terapeuta–estudiante. El enlace de invitación lleva al callback y a la pantalla donde el usuario define su propia contraseña.

La clave `SUPABASE_SERVICE_ROLE_KEY` solo se utiliza en rutas del servidor. La ruta de invitación y cada operación administrativa validan primero que la sesión autenticada tenga rol `administrador`. El panel protege contra la retirada accidental del único administrador activo.

## 3. Ejecutar localmente

Requisitos: Node.js 20.11 o superior (menor que 23) y npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configura `.env.local` con:

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave anon/publishable, apta para navegador porque RLS limita el acceso.
- `SUPABASE_SERVICE_ROLE_KEY`: clave privilegiada, exclusivamente del servidor. Nunca anteponer `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_APP_URL`: URL base local o pública de la aplicación. Es obligatoria para invitar cuentas y en Render debe ser el dominio HTTPS del servicio.

## 4. Desplegar en Render

1. Conecta el repositorio `botstefano/ResiliaUNT` como un servicio **Web Service**.
2. Selecciona runtime Node.
3. Build command: `npm install && npm run build`.
4. Start command: `npm start`.
5. Configura las variables de entorno anteriores desde el panel de Render; no las escribas en el repositorio. Define `NEXT_PUBLIC_APP_URL` con la URL HTTPS pública exacta de tu servicio, sin rutas adicionales.
6. Añade el dominio Render en la configuración URL de Supabase Auth y valida el inicio/cierre de sesión.
7. Prueba los perfiles `estudiante`, `terapeuta` y `administrador` por separado.

## 5. Módulos disponibles en esta base

- Login con Supabase Auth, recuperación de contraseña por correo y perfiles pendientes por defecto.
- Dashboard con los cuatro KPI, tendencia mensual, tasa de registros de hábitos y correlaciones exploratorias agregadas por estudiante (solo perfiles profesionales/administrativos).
- Exportación CSV agregada del resumen, sin nombres ni códigos de estudiantes.
- Portal estudiante: registro de hábitos, metas y consulta de sesiones propias.
- Portal terapeuta: cartera asignada, Perfil 360, registro de evaluación clínica y red de apoyo, selección de sala, programación y actualización de estado de sesiones.
- Portal administrador: invitación por correo, activación de perfiles y mantenimiento de asignaciones terapeuta–estudiante con historial.
- ETL OLTP → DataMart, refresco tras registros y script de validación.

## 6. Antes de producción

- Cambia el repositorio a privado si va a contener documentación interna o configuración no pública. No subas datos reales ni claves en ningún caso.
- El alcance, la versión del instrumento CD-RISC, las definiciones operativas y la forma de calcular cada KPI deben aprobarse con el responsable profesional e institucional.
- Define consentimiento, base legal, minimización, acceso, retención, rectificación y eliminación de datos, además del protocolo de incidentes.
- Revisa la seguridad/RLS y realiza pruebas con cuentas distintas y datos sintéticos antes de cargar registros reales.
- Los indicadores son descriptivos; no diagnostican ni recomiendan tratamientos. Los módulos de IA quedan fuera de esta primera fase.

## Validación que sigue pendiente

El workflow de GitHub Actions ejecuta instalación, TypeScript, pruebas unitarias, ESLint y build de producción en cada actualización de `main`. Comprueba la pestaña **Actions** para consultar el resultado del commit actual. Esto valida el código, no la conectividad con el proyecto real: los scripts SQL aún deben ejecutarse en Supabase, revisar sus permisos allí y probar el flujo con cuentas de cada rol. Render todavía no está desplegado.
