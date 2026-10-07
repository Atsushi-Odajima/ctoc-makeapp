// Operator-managed profile options (spec v4 §5). IDs are stable and must never be reused for a
// different meaning. To retire an option set `active: false` (users who picked it keep it).
// Do not add options that push users to disclose medical, discriminatory or sexual information.

export type ProfileOptionKindName = "STRENGTH" | "WEAKNESS" | "HOBBY"

export interface ProfileOptionSeed {
  id: string
  kind: ProfileOptionKindName
  label: string
  sortOrder: number
  active: boolean
}

const strengths: Array<[string, string]> = [
  ["str_cafe_drawer", "喫茶店の引き出しが多い"],
  ["str_remember_roads", "道を覚えるのが得意"],
  ["str_one_photo", "写真の一枚にこだわる"],
  ["str_cooking", "料理はわりと得意"],
  ["str_deep_knowledge", "好きなことには詳しい"],
  ["str_good_listener", "話を聞くのが得意"],
]

const weaknesses: Array<[string, string]> = [
  ["weak_mornings", "朝にめっぽう弱い"],
  ["weak_detours", "つい寄り道する"],
  ["weak_tidying_later", "片づけは後回し"],
  ["weak_directions", "方向音痴ぎみ"],
  ["weak_names", "名前を覚えるのが苦手"],
  ["weak_snacks", "おやつに弱い"],
]

const hobbies: Array<[string, string]> = [
  ["hobby_cafe", "喫茶店"],
  ["hobby_walk", "散歩"],
  ["hobby_photo", "写真"],
  ["hobby_movie", "映画"],
  ["hobby_music", "音楽"],
  ["hobby_reading", "読書"],
  ["hobby_cooking", "料理"],
  ["hobby_travel", "旅行"],
  ["hobby_games", "ゲーム"],
  ["hobby_sports", "スポーツ"],
  ["hobby_crafts", "ものづくり"],
  ["hobby_plants", "植物"],
  ["hobby_outdoor", "アウトドア"],
  ["hobby_anime", "アニメ"],
  ["hobby_pets", "ペット"],
  ["hobby_fashion", "ファッション"],
  ["hobby_vehicles", "乗りもの"],
  ["hobby_other", "その他"],
]

function build(kind: ProfileOptionKindName, rows: Array<[string, string]>): ProfileOptionSeed[] {
  return rows.map(([id, label], index) => ({ id, kind, label, sortOrder: (index + 1) * 10, active: true }))
}

export const PROFILE_OPTION_SEEDS: ProfileOptionSeed[] = [
  ...build("STRENGTH", strengths),
  ...build("WEAKNESS", weaknesses),
  ...build("HOBBY", hobbies),
]

export const PROFILE_LABELS = {
  strength: "イキリポイント",
  weakness: "残念な弱点",
  hobbies: "趣味3つ",
} as const

export const HOBBY_COUNT = 3
