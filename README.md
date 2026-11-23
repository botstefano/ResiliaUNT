# ResiliaUNT

Sistema web para el seguimiento académico de resiliencia psicológica y crecimiento postraumático de estudiantes de **Ingeniería de Sistemas de la Universidad Nacional de Trujillo (UNT)** que reciben atención en el servicio oficial de terapia considerado por el proyecto.

> **Estado del repositorio:** base funcional conectada al proyecto Supabase `ResiliaUNT`, con datos exclusivamente sintéticos y validaciones SQL ejecutadas. El despliegue en Render y las pruebas E2E de autenticación aún están pendientes.

## Alcance acordado

- Portales de uso: **Estudiante** y **Terapeuta**, más un espacio administrativo protegido para gestión de cuentas y asignaciones.
- Los cuatro indicadores oficiales se mantienen separados de las variables explicativas:
  1. Índice de resiliencia (escala CD-RISC, sujeto a confirmar la versión e instrumento aplicado).
  2. Frecuencia de pensamientos intrusivos.
  3. Cumplimiento de metas personales.
  4. Red de apoyo activa.
- Los hábitos son variables de seguimiento/análisis, no un quinto KPI oficial.
- Arquitectura actual: Next.js 14 + React + Tailwind, API Routes, Supabase PostgreSQL/Auth y visualizaciones Recharts. Render se considera como hosting de la aplicación. Azure/Power BI quedan fuera de esta fase.
- La integración con IA no se activa en esta primera fase. No se presenta el sistema como terapeuta, no diagnostica y no toma decisiones clínicas.

## Modelo de datos y decisiones de granularidad

Se mantienen las ocho dimensiones del planteamiento: tiempo, estudiante, terapeuta, sala de terapia, hábito, intensidad, categoría de meta y estado de red de apoyo.

El DataMart contiene **cuatro hechos**, no tres, porque las metas y la evaluación de red de apoyo tienen granos diferentes:

| Hecho | Grano | Propósito |
|---|---|---|
| `fact_evaluacion_clinica` | Una evaluación por estudiante y fecha | Resiliencia y pensamientos intrusivos |
| `fact_registro_habitos` | Un hábito por estudiante y fecha | Variable explicativa de seguimiento |
| `fact_seguimiento_meta` | Una observación de una meta por fecha | Cumplidas / pendientes |
| `fact_red_apoyo` | Una evaluación de red por estudiante y fecha | Red activa, contactos e interacciones |

Esta separación evita repetir conteos de metas en cada hábito y evita confundir cantidad de interacciones con existencia de una red de apoyo activa.

### Definiciones operativas iniciales de KPI

- **KPI 1 — Resiliencia:** promedio del puntaje de la última evaluación disponible por estudiante dentro del período. El rango `0–100` está modelado para la escala de 25 ítems; confirmar instrumento y protocolo local antes de usar datos reales.
- **KPI 2 — Pensamientos intrusivos:** promedio por estudiante usando su última frecuencia registrada en el período, normalizada a 30 días: `conteo / días_de_referencia × 30`.
- **KPI 3 — Cumplimiento de metas:** porcentaje de metas cuyo último estado observado dentro del período está marcado como cumplido. Cada meta cuenta una sola vez; las actualizaciones repetidas no inflan el numerador ni el denominador.
- **KPI 4 — Red de apoyo activa:** porcentaje de estudiantes con valoración registrada en el período cuya última valoración indica `red_apoyo_activa = true`. Cada estudiante cuenta una sola vez en el denominador; las valoraciones repetidas no aumentan su peso. Contactos e interacciones se muestran como variables complementarias y usan también la última valoración disponible por estudiante.

Las tarjetas de KPI 1–4 muestran una observación por estudiante o por meta, según corresponda. El gráfico mensual resume primero las evaluaciones por estudiante-mes y luego promedia entre estudiantes. Las correlaciones exploratorias de hábitos usan una observación agregada por estudiante, requieren al menos 10 estudiantes emparejados y no permiten inferir causalidad. Estas definiciones deben contrastarse con la rúbrica/instrumento oficial del proyecto antes de usar resultados en un informe institucional.

## Estructura

```text
database/supabase/
  001_oltp.sql
  002_datamart.sql
  003_security_rls.sql
  004_etl.sql
  005_seed_demo.sql
  006_validaciones_kpi.sql
  007_permisos_escritura_api.sql
  008_meta_transaccional.sql
  009_admin_asignaciones.sql
  010_hardening_rls.sql
  011_foreign_key_indexes.sql
  012_generador_demo_completo.sql
docs/
  GUIA_SUPABASE_RENDER.md
  IMPLEMENTACION_ACTUAL.md
src/app/
  (portal)/portal/
    admin/
    habitos/
    metas/
    sesiones/
    terapeuta/
  api/
    admin/
    therapist/
    habits/
    goals/
    sessions/
  auth/callback/
  forgot-password/
  login/
  reset-password/
components/
lib/
  analytics/
  auth/
  supabase/
tests/
```

## Instalación local

Requisitos: Node.js 20 LTS o compatible, npm y un proyecto Supabase.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Completar `.env.local` con URL y clave pública/anon de Supabase. La `SUPABASE_SERVICE_ROLE_KEY` es solo de servidor y debe mantenerse secreta. Para activar el selector sintético, configura `DEMO_MODE_ENABLED=true` y un `DEMO_SESSION_SECRET` aleatorio de al menos 32 bytes.

## Preparación de Supabase

En el SQL Editor, ejecutar en este orden:

1. `database/supabase/001_oltp.sql`
2. `database/supabase/002_datamart.sql`
3. `database/supabase/003_security_rls.sql`
4. `database/supabase/007_permisos_escritura_api.sql` (permisos mínimos de escritura para el portal profesional).
5. `database/supabase/008_meta_transaccional.sql` (creación atómica de meta y estado inicial).
6. `database/supabase/009_admin_asignaciones.sql` (historial de asignaciones y permisos del panel administrativo).
7. `database/supabase/004_etl.sql`
8. `database/supabase/010_hardening_rls.sql` — helpers internos y políticas de autorización endurecidas.
9. `database/supabase/011_foreign_key_indexes.sql` — índices de soporte para las relaciones.
10. Opcional, únicamente para desarrollo inicial: `database/supabase/005_seed_demo.sql`
11. Para el conjunto sintético completo: `database/supabase/012_generador_demo_completo.sql`. Es idempotente y amplía la simulación a 200 estudiantes, 2,400 evaluaciones, más de 21,000 hábitos, metas, red de apoyo y sesiones; conserva los datos existentes y refresca el DataMart.
12. Revisa `database/supabase/006_validaciones_kpi.sql`.

Luego, en **Project Settings → API → Exposed schemas**, mantener `public` y agregar `oltp_resiliencia` y `datamart_resiliencia`. No exponer `resilia_private`, que contiene funciones internas de autorización.

### Crear el primer administrador y habilitar cuentas

El trigger crea todo usuario nuevo con rol `pendiente`. El propietario del proyecto crea o invita al primer usuario administrador desde **Supabase → Authentication → Users** y lo habilita una sola vez desde SQL Editor, utilizando el correo de esa cuenta:

```sql
update public.perfiles_app
set rol = 'administrador',
    id_estudiante = null,
    id_terapeuta = null,
    nombre_visible = 'Administración ResiliaUNT'
where id = (
  select id from auth.users
  where email = 'CORREO_DEL_PRIMER_ADMINISTRADOR'
);
```

Después de volver a iniciar sesión, el administrador utiliza `/portal/admin` para invitar nuevas cuentas por correo, habilitar perfiles como estudiante o terapeuta, vincularlos con registros institucionales y crear/cerrar asignaciones terapeuta–estudiante. Las asignaciones cerradas conservan su historial. No hay autoasignación de roles desde un formulario público. No promuevas cuentas a administrador salvo personal expresamente autorizado.

## Seguridad y datos

- El repositorio no debe contener datos reales, nombres reales, mediciones clínicas, correos, UUID de usuarios, JWT, claves Supabase ni archivos `.env`.
- `005_seed_demo.sql` solo crea identidades y registros demostrativos sintéticos. No utilizar como evidencia académica ni como datos clínicos.
- Supabase Auth crea perfiles con rol `pendiente`; tras el bootstrap del primer administrador, las habilitaciones ordinarias se realizan desde `/portal/admin`.
- Las tablas OLTP y del DataMart tienen RLS. Las consultas privilegiadas de servidor deben comprobar usuario, rol y estudiantes asignados antes de usar la clave `service_role`.
- No almacenar notas clínicas narrativas, diagnósticos o relatos traumáticos en campos libres de esta primera versión.
- Antes de producción: revisión de privacidad institucional, consentimiento informado, retención/eliminación, protocolo de incidentes, accesibilidad, autorización de responsables del servicio y revisión profesional de instrumentos.

## Modo de demostración

Con `DEMO_MODE_ENABLED=true` y `DEMO_SESSION_SECRET` configurado solo en el servidor, la ruta `/demo` permite entrar como uno de los 200 estudiantes o uno de los tres terapeutas sintéticos, sin crear usuarios en Supabase Auth. La sesión temporal se firma en servidor y caduca a las 4 horas. Cada estudiante ve y modifica solo sus datos; cada terapeuta consulta su cartera activa asignada. No existe identidad demo de administrador. Mantén el modo deshabilitado para entornos con datos reales.

## Módulos implementados en esta primera base

- Acceso con Supabase Auth y recuperación de contraseña por correo; el usuario nuevo queda con rol `pendiente` hasta habilitación administrativa.
- Portal estudiante: KPI personales, registro diario de hábitos, metas y consulta de sesiones propias.
- Portal terapeuta: panel analítico, cartera asignada, Perfil 360 individual, evaluaciones clínicas, valoración de red de apoyo, programación y actualización de estado de sesiones, selección de sala y correlaciones exploratorias hábitos–indicadores (descriptivas, no causales). El panel administrativo también puede consultar el tablero general.
- Portal administrador: alta de estudiantes, terapeutas y salas; invitaciones por correo; habilitación de perfiles; vinculación de cuentas y administración de asignaciones con historial.
- Rutas API con validación de entrada, comprobación de rol y alcance; la clave `service_role` permanece en servidor.
- ETL con UPSERT de dimensiones y refresco transaccional de las cuatro tablas de hechos.
- Exportación CSV de los KPI y variables complementarias, con agregados y sin identificadores personales.
- CI en GitHub Actions: instalación, TypeScript, pruebas unitarias, ESLint y build de producción.

La guía paso a paso de Supabase, asignación de perfiles y despliegue en Render está en [`docs/GUIA_SUPABASE_RENDER.md`](docs/GUIA_SUPABASE_RENDER.md).

## Validaciones disponibles

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

El workflow de GitHub Actions ejecuta `npm install`, `npm run typecheck`, `npm test`, `npm run lint` y `npm run build` ante cada actualización de `main`. Consulta la pestaña **Actions** para ver el resultado del commit más reciente. El proyecto Supabase `ResiliaUNT` ya contiene el esquema y el seed sintético, y los clientes TypeScript usan `src/lib/supabase/database.types.ts`, generado desde las 23 tablas de aplicación. Todavía falta desplegar en Render, configurar sus variables de entorno, completar el bootstrap del primer administrador y probar el flujo E2E de Auth.