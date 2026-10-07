import type { Metadata } from "next"
import { ProfileEditor } from "@/components/profile/ProfileEditor"

export const metadata: Metadata = { title: "プロフィールを編集" }

export default function EditProfilePage() {
  return <ProfileEditor />
}
