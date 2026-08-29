import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Konto erstellen" };

export default function RegisterPage() {
  return <RegisterForm />;
}
