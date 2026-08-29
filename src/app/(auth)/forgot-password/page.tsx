import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Passwort zurücksetzen" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
