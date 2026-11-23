import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import StudentProfile360 from "./student-profile-360";

export default async function StudentProfilePage({ params }: { params: { id: string } }) {
  const { user, profile } = await getAuthContext();
  if (!user) redirect("/login");
  if (!profile || !["terapeuta", "administrador"].includes(profile.rol)) redirect("/portal");
  return <StudentProfile360 studentId={params.id} />;
}
