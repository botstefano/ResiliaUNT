import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";

export default async function HomePage() {
  const { user } = await getAuthContext();
  redirect(user ? "/portal" : "/login");
}
