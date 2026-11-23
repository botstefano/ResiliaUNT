"use client";

import { FormEvent, useEffect, useState } from "react";

type Role = "pendiente" | "estudiante" | "terapeuta" | "administrador";
type Account = { id: string; rol: Role; id_estudiante: number | null; id_terapeuta: number | null; nombre_visible: string | null; email: string | null; last_sign_in_at: string | null };
type Student = { id_estudiante: number; codigo_universitario: string; nombre_visible: string };
type Therapist = { id_terapeuta: number; codigo_terapeuta: string; nombre: string };
type Room = { id_sala: number; codigo_sala: string; nombre_sala: string; pabellon: string | null; modalidad: string; capacidad: number };
type Assignment = { id_asignacion: number; id_terapeuta: number; id_estudiante: number; fecha_inicio: string; fecha_fin: string | null; activo: boolean; student_name: string; student_code: string; therapist_name: string; therapist_code: string };
type AdminData = { accounts: Account[]; students: Student[]; therapists: Therapist[]; rooms: Room[]; assignments: Assignment[]; note: string | null };

export default function AdminWorkspace() {
  const [data, setData] = useState<AdminData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentCycle, setStudentCycle] = useState("");
  const [studentShift, setStudentShift] = useState("");
  const [therapistCode, setTherapistCode] = useState("");
  const [therapistName, setTherapistName] = useState("");
  const [therapistSpecialty, setTherapistSpecialty] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomBuilding, setRoomBuilding] = useState("");
  const [roomModality, setRoomModality] = useState("Presencial");
  const [roomCapacity, setRoomCapacity] = useState("1");
  const [role, setRole] = useState<Role>("pendiente");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [therapistId, setTherapistId] = useState("");
  const [assignmentStudent, setAssignmentStudent] = useState("");
  const [assignmentTherapist, setAssignmentTherapist] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/accounts", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudieron cargar los usuarios.");
    const nextData = result as AdminData;
    setData(nextData);
    const current = nextData.accounts.find((account) => account.id === selectedId) ?? nextData.accounts[0];
    if (current) {
      setSelectedId(current.id);
      setRole(current.rol);
      setName(current.nombre_visible ?? "");
      setStudentId(current.id_estudiante ? String(current.id_estudiante) : "");
      setTherapistId(current.id_terapeuta ? String(current.id_terapeuta) : "");
    }
    if (!assignmentStudent && nextData.students.length) setAssignmentStudent(String(nextData.students[0].id_estudiante));
    if (!assignmentTherapist && nextData.therapists.length) setAssignmentTherapist(String(nextData.therapists[0].id_terapeuta));
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Error cargando administración.");
      setLoading(false);
    });
  }, []);

  function selectAccount(id: string) {
    const account = data?.accounts.find((item) => item.id === id);
    if (!account) return;
    setSelectedId(account.id);
    setRole(account.rol);
    setName(account.nombre_visible ?? "");
    setStudentId(account.id_estudiante ? String(account.id_estudiante) : "");
    setTherapistId(account.id_terapeuta ? String(account.id_terapeuta) : "");
    setMessage("");
    setError("");
  }

  async function inviteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo enviar la invitación.");
      setMessage(result.message || "Invitación enviada.");
      setInviteEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la invitación.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCatalog(
    event: FormEvent<HTMLFormElement>,
    payload: Record<string, string | number | null>,
    successMessage: string,
    clearForm: () => void,
  ) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/catalogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo crear el registro institucional.");
      setMessage(successMessage);
      clearForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el registro institucional.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setMessage("");
    setError("");

    const body: Record<string, string | number> = {
      userId: selectedId,
      rol: role,
      nombre_visible: name.trim(),
    };
    if (role === "estudiante") body.id_estudiante = Number(studentId);
    if (role === "terapeuta") body.id_terapeuta = Number(therapistId);

    try {
      const response = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar la cuenta.");
      setMessage("Perfil de acceso actualizado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function assignStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignmentStudent || !assignmentTherapist) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_estudiante: Number(assignmentStudent),
          id_terapeuta: Number(assignmentTherapist),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo crear la asignación.");
      setMessage("Relación terapeuta–estudiante guardada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la asignación.");
    } finally {
      setSaving(false);
    }
  }

  async function closeAssignment(assignment: Assignment) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_terapeuta: assignment.id_terapeuta,
          id_estudiante: assignment.id_estudiante,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cerrar la asignación.");
      setMessage("Asignación cerrada; el historial permanece disponible.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cerrar la asignación.");
    } finally {
      setSaving(false);
    }
  }

  const selectedAccount = data?.accounts.find((account) => account.id === selectedId);

  if (loading) return <p className="text-sm text-muted">Cargando usuarios y asignaciones...</p>;
  if (!data) return <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error || "Administración no disponible."}</div>;

  return (
    <div className="space-y-6">
      {data.note && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{data.note}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</p>}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <p className="text-sm text-muted">Cuentas registradas</p>
          <p className="mt-2 text-3xl font-semibold">{data.accounts.length}</p>
        </article>
        <article className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <p className="text-sm text-muted">Perfiles pendientes</p>
          <p className="mt-2 text-3xl font-semibold">{data.accounts.filter((account) => account.rol === "pendiente").length}</p>
        </article>
        <article className="rounded-2xl border border-line bg-white p-5 shadow-soft">
          <p className="text-sm text-muted">Asignaciones activas</p>
          <p className="mt-2 text-3xl font-semibold">{data.assignments.filter((assignment) => assignment.activo).length}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="mb-5">
          <h2 className="font-semibold">Catálogos institucionales</h2>
          <p className="mt-1 text-xs leading-5 text-muted">Registra primero estudiantes, terapeutas y salas que existan en el servicio. Los códigos deben ser institucionales y únicos. No introduzcas información clínica aquí.</p>
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <form onSubmit={(event) => saveCatalog(event, {
            kind: "estudiante",
            codigo_universitario: studentCode,
            nombre_visible: studentName,
            ciclo_academico: studentCycle ? Number(studentCycle) : null,
            turno: studentShift || null,
          }, "Estudiante registrado correctamente.", () => {
            setStudentCode(""); setStudentName(""); setStudentCycle(""); setStudentShift("");
          })} className="space-y-3 rounded-xl border border-line p-4">
            <h3 className="text-sm font-semibold">Nuevo estudiante</h3>
            <div>
              <label htmlFor="newStudentCode" className="mb-1.5 block text-xs font-medium">Código universitario</label>
              <input id="newStudentCode" required maxLength={20} value={studentCode} onChange={(event) => setStudentCode(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="newStudentName" className="mb-1.5 block text-xs font-medium">Nombre visible</label>
              <input id="newStudentName" required maxLength={150} value={studentName} onChange={(event) => setStudentName(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="newStudentCycle" className="mb-1.5 block text-xs font-medium">Ciclo (opcional)</label>
              <input id="newStudentCycle" type="number" min="1" max="14" value={studentCycle} onChange={(event) => setStudentCycle(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="newStudentShift" className="mb-1.5 block text-xs font-medium">Turno (opcional)</label>
              <select id="newStudentShift" value={studentShift} onChange={(event) => setStudentShift(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm">
                <option value="">Sin especificar</option><option>Mañana</option><option>Tarde</option><option>Noche</option>
              </select>
            </div>
            <button disabled={saving || !studentCode.trim() || !studentName.trim()} className="w-full rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Guardar estudiante</button>
          </form>

          <form onSubmit={(event) => saveCatalog(event, {
            kind: "terapeuta",
            codigo_terapeuta: therapistCode,
            nombre: therapistName,
            especialidad: therapistSpecialty || null,
          }, "Profesional registrado correctamente.", () => {
            setTherapistCode(""); setTherapistName(""); setTherapistSpecialty("");
          })} className="space-y-3 rounded-xl border border-line p-4">
            <h3 className="text-sm font-semibold">Nuevo terapeuta</h3>
            <div>
              <label htmlFor="newTherapistCode" className="mb-1.5 block text-xs font-medium">Código profesional</label>
              <input id="newTherapistCode" required maxLength={30} value={therapistCode} onChange={(event) => setTherapistCode(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="newTherapistName" className="mb-1.5 block text-xs font-medium">Nombre visible</label>
              <input id="newTherapistName" required maxLength={150} value={therapistName} onChange={(event) => setTherapistName(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="newTherapistSpecialty" className="mb-1.5 block text-xs font-medium">Especialidad (opcional)</label>
              <input id="newTherapistSpecialty" maxLength={100} value={therapistSpecialty} onChange={(event) => setTherapistSpecialty(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
            </div>
            <button disabled={saving || !therapistCode.trim() || !therapistName.trim()} className="w-full rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Guardar terapeuta</button>
          </form>

          <form onSubmit={(event) => saveCatalog(event, {
            kind: "sala",
            codigo_sala: roomCode,
            nombre_sala: roomName,
            pabellon: roomBuilding || null,
            modalidad: roomModality,
            capacidad: Number(roomCapacity),
          }, "Sala registrada correctamente.", () => {
            setRoomCode(""); setRoomName(""); setRoomBuilding(""); setRoomModality("Presencial"); setRoomCapacity("1");
          })} className="space-y-3 rounded-xl border border-line p-4">
            <h3 className="text-sm font-semibold">Nueva sala de terapia</h3>
            <div>
              <label htmlFor="newRoomCode" className="mb-1.5 block text-xs font-medium">Código de sala</label>
              <input id="newRoomCode" required maxLength={30} value={roomCode} onChange={(event) => setRoomCode(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="newRoomName" className="mb-1.5 block text-xs font-medium">Nombre de sala</label>
              <input id="newRoomName" required maxLength={100} value={roomName} onChange={(event) => setRoomName(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="newRoomBuilding" className="mb-1.5 block text-xs font-medium">Pabellón / ubicación</label>
              <input id="newRoomBuilding" maxLength={100} value={roomBuilding} onChange={(event) => setRoomBuilding(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="newRoomModality" className="mb-1.5 block text-xs font-medium">Modalidad</label>
              <select id="newRoomModality" value={roomModality} onChange={(event) => setRoomModality(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm">
                <option>Presencial</option><option>Virtual</option><option>Mixta</option>
              </select>
            </div>
            <div>
              <label htmlFor="newRoomCapacity" className="mb-1.5 block text-xs font-medium">Capacidad</label>
              <input id="newRoomCapacity" type="number" min="1" max="100" required value={roomCapacity} onChange={(event) => setRoomCapacity(event.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
            </div>
            <button disabled={saving || !roomCode.trim() || !roomName.trim()} className="w-full rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Guardar sala</button>
          </form>
        </div>
        <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-3">
          <p>{data.students.length} estudiantes activos</p>
          <p>{data.therapists.length} terapeutas activos</p>
          <p>{data.rooms.length} salas activas</p>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="mb-5">
          <h2 className="font-semibold">Invitar a un usuario</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Envía un enlace al correo institucional. Al aceptar y establecer su contraseña, el usuario aparecerá con rol pendiente para que puedas vincularlo.
          </p>
        </div>
        <form onSubmit={inviteAccount} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="inviteEmail" className="mb-2 block text-sm font-medium">Correo electrónico</label>
            <input id="inviteEmail" type="email" required maxLength={254} value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="usuario@unitru.edu.pe"
              className="w-full rounded-xl border border-line px-3 py-3" />
          </div>
          <button type="submit" disabled={saving || !inviteEmail.trim()}
            className="self-end rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Enviando..." : "Enviar invitación"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="mb-5">
          <h2 className="font-semibold">Habilitar una cuenta</h2>
          <p className="mt-1 text-xs leading-5 text-muted">La cuenta debe existir previamente en Supabase Auth. Aquí solo se configura el perfil y su vinculación institucional.</p>
        </div>
        <form onSubmit={saveAccount} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="account" className="mb-2 block text-sm font-medium">Cuenta registrada</label>
            <select id="account" value={selectedId} onChange={(event) => selectAccount(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3">
              {data.accounts.map((account) => <option key={account.id} value={account.id}>
                {(account.email || account.id.slice(0, 8)) + " · " + account.rol}
              </option>)}
            </select>
          </div>
          <div>
            <label htmlFor="visibleName" className="mb-2 block text-sm font-medium">Nombre visible</label>
            <input id="visibleName" value={name} onChange={(event) => setName(event.target.value)} maxLength={150} className="w-full rounded-xl border border-line px-3 py-3" placeholder="Nombre para mostrar" />
          </div>
          <div>
            <label htmlFor="role" className="mb-2 block text-sm font-medium">Rol</label>
            <select id="role" value={role} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded-xl border border-line px-3 py-3">
              <option value="pendiente">Pendiente</option>
              <option value="estudiante">Estudiante</option>
              <option value="terapeuta">Terapeuta</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
          {role === "estudiante" && <div className="md:col-span-2">
            <label htmlFor="studentProfile" className="mb-2 block text-sm font-medium">Registro del estudiante</label>
            <select id="studentProfile" required value={studentId} onChange={(event) => setStudentId(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3">
              <option value="">Selecciona el estudiante</option>
              {data.students.map((student) => <option key={student.id_estudiante} value={student.id_estudiante}>{student.nombre_visible} · {student.codigo_universitario}</option>)}
            </select>
          </div>}
          {role === "terapeuta" && <div className="md:col-span-2">
            <label htmlFor="therapistProfile" className="mb-2 block text-sm font-medium">Registro profesional</label>
            <select id="therapistProfile" required value={therapistId} onChange={(event) => setTherapistId(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3">
              <option value="">Selecciona el terapeuta</option>
              {data.therapists.map((therapist) => <option key={therapist.id_terapeuta} value={therapist.id_terapeuta}>{therapist.nombre} · {therapist.codigo_terapeuta}</option>)}
            </select>
          </div>}
          <div className="md:col-span-2">
            <button disabled={saving || !selectedId || (role === "estudiante" && !studentId) || (role === "terapeuta" && !therapistId)} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar perfil"}
            </button>
          </div>
        </form>
        {selectedAccount?.last_sign_in_at && <p className="mt-4 text-xs text-muted">Último acceso: {new Date(selectedAccount.last_sign_in_at).toLocaleString("es-PE")}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft">
        <div className="mb-5">
          <h2 className="font-semibold">Asignar terapeuta a estudiante</h2>
          <p className="mt-1 text-xs leading-5 text-muted">Esta relación define el alcance de consulta del terapeuta. Se puede cerrar sin borrar su historial.</p>
        </div>
        <form onSubmit={assignStudent} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor="assignmentTherapist" className="mb-2 block text-sm font-medium">Terapeuta</label>
            <select id="assignmentTherapist" required value={assignmentTherapist} onChange={(event) => setAssignmentTherapist(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3">
              <option value="">Selecciona terapeuta</option>
              {data.therapists.map((therapist) => <option key={therapist.id_terapeuta} value={therapist.id_terapeuta}>{therapist.nombre}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="assignmentStudent" className="mb-2 block text-sm font-medium">Estudiante</label>
            <select id="assignmentStudent" required value={assignmentStudent} onChange={(event) => setAssignmentStudent(event.target.value)} className="w-full rounded-xl border border-line px-3 py-3">
              <option value="">Selecciona estudiante</option>
              {data.students.map((student) => <option key={student.id_estudiante} value={student.id_estudiante}>{student.nombre_visible} · {student.codigo_universitario}</option>)}
            </select>
          </div>
          <button disabled={saving || !assignmentTherapist || !assignmentStudent} className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Asignar</button>
        </form>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead><tr className="border-b border-line text-xs text-muted">
              <th className="pb-3 pr-4 font-medium">Terapeuta</th><th className="pb-3 pr-4 font-medium">Estudiante</th><th className="pb-3 pr-4 font-medium">Inicio</th><th className="pb-3 pr-4 font-medium">Estado</th><th className="pb-3 font-medium">Acción</th>
            </tr></thead>
            <tbody>{data.assignments.map((assignment) => <tr key={assignment.id_asignacion} className="border-b border-line last:border-0">
              <td className="py-3 pr-4">{assignment.therapist_name}</td>
              <td className="py-3 pr-4">{assignment.student_name}</td>
              <td className="py-3 pr-4">{assignment.fecha_inicio}</td>
              <td className="py-3 pr-4"><span className={"rounded-full px-2.5 py-1 text-xs " + (assignment.activo ? "bg-teal-50 text-teal-700" : "bg-canvas text-muted")}>{assignment.activo ? "Activa" : "Cerrada"}</span></td>
              <td className="py-3">{assignment.activo && <button type="button" disabled={saving} onClick={() => closeAssignment(assignment)} className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50">Cerrar</button>}</td>
            </tr>)}</tbody>
          </table>
          {!data.assignments.length && <p className="mt-3 text-sm text-muted">Todavía no hay relaciones terapeuta–estudiante.</p>}
        </div>
      </section>
      <p className="text-xs leading-5 text-muted">Las cuentas nuevas reciben el rol pendiente automáticamente. Promueve a administrador solo a personal autorizado; el sistema impide retirar el único administrador activo. Las invitaciones se envían desde este panel; el usuario establece su propia contraseña mediante un enlace seguro de Supabase Auth.</p>
    </div>
  );
}
