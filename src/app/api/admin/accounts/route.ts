import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/context";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { todayInPeru } from "@/lib/dates";

export const dynamic = "force-dynamic";

async function requireAdministrator() {
  const context = await getAuthContext();
  if (!context.user) return { response: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  if (context.profile?.rol !== "administrador") {
    return { response: NextResponse.json({ error: "Esta operación requiere rol de administrador." }, { status: 403 }) };
  }
  return { user: context.user };
}

export async function GET() {
  const auth = await requireAdministrator();
  if ("response" in auth) return auth.response;

  try {
    const admin = createSupabaseAdminClient();
    const [profilesResult, studentsResult, therapistsResult, assignmentsResult, usersResult] = await Promise.all([
      admin.from("perfiles_app").select("id, rol, id_estudiante, id_terapeuta, nombre_visible, created_at").order("created_at", { ascending: false }),
      admin.schema("oltp_resiliencia").from("estudiante").select("id_estudiante, codigo_universitario, nombre_visible, activo").eq("activo", true).order("nombre_visible"),
      admin.schema("oltp_resiliencia").from("terapeuta").select("id_terapeuta, codigo_terapeuta, nombre, activo").eq("activo", true).order("nombre"),
      admin.schema("oltp_resiliencia").from("terapeuta_estudiante").select("id_asignacion, id_terapeuta, id_estudiante, fecha_inicio, fecha_fin, activo").order("created_at", { ascending: false }),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const errors = [profilesResult.error, studentsResult.error, therapistsResult.error, assignmentsResult.error, usersResult.error].filter(Boolean);
    if (errors.length) {
      console.error("Error consultando administración ResiliaUNT:", errors);
      return NextResponse.json({ error: "No se pudieron cargar los datos administrativos." }, { status: 500 });
    }

    const usersById = new Map((usersResult.data.users ?? []).map((account) => [account.id, account]));
    const studentsById = new Map((studentsResult.data ?? []).map((student) => [student.id_estudiante, student]));
    const therapistsById = new Map((therapistsResult.data ?? []).map((therapist) => [therapist.id_terapeuta, therapist]));

    const accounts = (profilesResult.data ?? []).map((profile) => {
      const account = usersById.get(profile.id);
      return {
        ...profile,
        email: account?.email ?? null,
        last_sign_in_at: account?.last_sign_in_at ?? null,
      };
    });

    const assignments = (assignmentsResult.data ?? []).map((assignment) => ({
      ...assignment,
      student_name: studentsById.get(assignment.id_estudiante)?.nombre_visible ?? "Estudiante",
      student_code: studentsById.get(assignment.id_estudiante)?.codigo_universitario ?? "",
      therapist_name: therapistsById.get(assignment.id_terapeuta)?.nombre ?? "Terapeuta",
      therapist_code: therapistsById.get(assignment.id_terapeuta)?.codigo_terapeuta ?? "",
    }));

    return NextResponse.json({
      accounts,
      students: studentsResult.data ?? [],
      therapists: therapistsResult.data ?? [],
      assignments,
      note: (usersResult.data.users ?? []).length >= 1000
        ? "La lista de identidades está limitada a las primeras 1000 cuentas."
        : null,
    });
  } catch (error) {
    console.error("Error en GET /api/admin/accounts:", error);
    return NextResponse.json({ error: "No se pudo inicializar la administración. Revisa SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  }
}

const profileSchema = z.object({
  userId: z.string().uuid(),
  rol: z.enum(["pendiente", "estudiante", "terapeuta", "administrador"]),
  id_estudiante: z.coerce.number().int().positive().nullable().optional(),
  id_terapeuta: z.coerce.number().int().positive().nullable().optional(),
  nombre_visible: z.string().trim().max(150).nullable().optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireAdministrator();
  if ("response" in auth) return auth.response;

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos de perfil inválidos." }, { status: 400 });

  const values = parsed.data;
  if (values.userId === auth.user.id && values.rol !== "administrador") {
    return NextResponse.json({ error: "No puedes retirar tu propio rol de administrador durante esta sesión." }, { status: 400 });
  }

  const idStudent = values.rol === "estudiante" ? values.id_estudiante ?? null : null;
  const idTherapist = values.rol === "terapeuta" ? values.id_terapeuta ?? null : null;

  if (values.rol === "estudiante" && !idStudent) {
    return NextResponse.json({ error: "Selecciona el registro institucional del estudiante." }, { status: 400 });
  }
  if (values.rol === "terapeuta" && !idTherapist) {
    return NextResponse.json({ error: "Selecciona el registro del terapeuta." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();

    const { data: current, error: currentError } = await admin.from("perfiles_app")
      .select("id, rol").eq("id", values.userId).maybeSingle();
    if (currentError || !current) return NextResponse.json({ error: "No se encontró el perfil de autenticación seleccionado." }, { status: 404 });

    if (current.rol === "administrador" && values.rol !== "administrador") {
      const { count, error } = await admin.from("perfiles_app").select("id", { count: "exact", head: true }).eq("rol", "administrador");
      if (error) return NextResponse.json({ error: "No se pudo verificar la cantidad de administradores." }, { status: 500 });
      if ((count ?? 0) <= 1) return NextResponse.json({ error: "No puedes retirar el único rol de administrador activo." }, { status: 400 });
    }

    if (idStudent) {
      const { data } = await admin.schema("oltp_resiliencia").from("estudiante")
        .select("id_estudiante").eq("id_estudiante", idStudent).eq("activo", true).maybeSingle();
      if (!data) return NextResponse.json({ error: "El estudiante no existe o está inactivo." }, { status: 400 });
    }
    if (idTherapist) {
      const { data } = await admin.schema("oltp_resiliencia").from("terapeuta")
        .select("id_terapeuta").eq("id_terapeuta", idTherapist).eq("activo", true).maybeSingle();
      if (!data) return NextResponse.json({ error: "El terapeuta no existe o está inactivo." }, { status: 400 });
    }

    const { error } = await admin.from("perfiles_app").update({
      rol: values.rol,
      id_estudiante: idStudent,
      id_terapeuta: idTherapist,
      nombre_visible: values.nombre_visible?.trim() || null,
    }).eq("id", values.userId);

    if (error) {
      console.error("No se pudo actualizar el perfil administrativo:", error.message);
      return NextResponse.json({ error: "No se pudo actualizar el perfil. Verifica que el estudiante o terapeuta no esté vinculado a otra cuenta." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en PATCH /api/admin/accounts:", error);
    return NextResponse.json({ error: "No se pudo inicializar la operación administrativa." }, { status: 500 });
  }
}

const assignmentSchema = z.object({
  id_terapeuta: z.coerce.number().int().positive(),
  id_estudiante: z.coerce.number().int().positive(),
  fecha_inicio: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdministrator();
  if ("response" in auth) return auth.response;

  const parsed = assignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos de asignación inválidos." }, { status: 400 });

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.schema("oltp_resiliencia").from("terapeuta_estudiante")
      .upsert({
        id_terapeuta: parsed.data.id_terapeuta,
        id_estudiante: parsed.data.id_estudiante,
        fecha_inicio: parsed.data.fecha_inicio || todayInPeru(),
        fecha_fin: null,
        activo: true,
      }, { onConflict: "id_terapeuta,id_estudiante" })
      .select("id_asignacion, id_terapeuta, id_estudiante, fecha_inicio, activo")
      .single();

    if (error) {
      console.error("Error creando asignación:", error.message);
      return NextResponse.json({ error: "No se pudo asignar. Comprueba que ambos registros institucionales estén activos." }, { status: 400 });
    }
    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/admin/accounts:", error);
    return NextResponse.json({ error: "No se pudo inicializar la operación administrativa." }, { status: 500 });
  }
}

const closeAssignmentSchema = z.object({
  id_terapeuta: z.coerce.number().int().positive(),
  id_estudiante: z.coerce.number().int().positive(),
});

export async function DELETE(request: Request) {
  const auth = await requireAdministrator();
  if ("response" in auth) return auth.response;

  const parsed = closeAssignmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Identificadores de asignación inválidos." }, { status: 400 });

  try {
    const admin = createSupabaseAdminClient();
    const { data: existing, error: readError } = await admin.schema("oltp_resiliencia").from("terapeuta_estudiante")
      .select("fecha_inicio, activo")
      .eq("id_terapeuta", parsed.data.id_terapeuta)
      .eq("id_estudiante", parsed.data.id_estudiante)
      .maybeSingle();
    if (readError || !existing || !existing.activo) return NextResponse.json({ error: "No existe una asignación activa para cerrar." }, { status: 404 });

    const today = todayInPeru();
    const endDate = today < existing.fecha_inicio ? existing.fecha_inicio : today;
    const { error } = await admin.schema("oltp_resiliencia").from("terapeuta_estudiante")
      .update({ activo: false, fecha_fin: endDate })
      .eq("id_terapeuta", parsed.data.id_terapeuta)
      .eq("id_estudiante", parsed.data.id_estudiante);
    if (error) return NextResponse.json({ error: "No se pudo cerrar la asignación." }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en DELETE /api/admin/accounts:", error);
    return NextResponse.json({ error: "No se pudo inicializar la operación administrativa." }, { status: 500 });
  }
}
