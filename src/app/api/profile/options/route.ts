import { ok, route } from "@/lib/api/http"
import { getProfileOptions } from "@/lib/services/profile"

export const GET = route(async () => ok(await getProfileOptions()))
