import type { Metadata } from "next"
import { RegisterForm } from "@/components/auth/RegisterForm"

export const metadata: Metadata = { title: "新規登録" }

export default function RegisterPage() {
  return <RegisterForm />
}
