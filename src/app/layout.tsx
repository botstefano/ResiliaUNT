import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResiliaUNT | Seguimiento y acompañamiento",
  description: "Plataforma de seguimiento académico y acompañamiento estudiantil de Ingeniería de Sistemas - UNT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
