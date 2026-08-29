import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Neues Passwort" };

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
