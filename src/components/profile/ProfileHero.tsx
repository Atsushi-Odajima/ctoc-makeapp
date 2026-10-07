"use client"

import { Avatar } from "@/components/ui/Avatar"
import { DayNetMark } from "@/components/brand/DayNetMark"
import { Icon } from "@/components/ui/Icon"
import type { PublicUser } from "@/lib/dto/user"

// Lilac profile panel (radius 18, padding 20). Order is fixed by the spec:
// avatar + name → bio → イキリポイント → 残念な弱点 → 趣味3つ. These are public profile info.
export function ProfileHero({ user }: { user: Pick<PublicUser, "id" | "name" | "username" | "avatar" | "bio" | "website" | "strength" | "weakness" | "hobbies" | "isPrivate"> }) {
  return (
    <section className="relative overflow-hidden rounded-[18px] bg-lilac p-5" aria-label="プロフィール">
      <div className="pointer-events-none absolute -right-[30px] -top-[36px] opacity-20" aria-hidden>
        <DayNetMark size={176} />
      </div>
      <div className="relative flex items-center gap-[13px]">
        <span className="rounded-[19px] border-[3px] border-canvas">
          <Avatar user={user} size={60} decorative={false} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[25px] font-bold leading-[37px] tracking-[-0.025em]">{user.name || user.username}</h1>
          <p className="flex items-center gap-1 font-latin text-[13px]">@{user.username}{user.isPrivate && <span className="inline-flex items-center gap-0.5 t-tiny" title="非公開アカウント"><Icon name="lock" size={12} />非公開</span>}</p>
        </div>
      </div>
      {user.bio && <p className="relative mt-[14px] whitespace-pre-wrap text-[12px] leading-[22px]">{user.bio}</p>}
      {user.website && (
        <a href={user.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="relative mt-1 block truncate text-[12px] underline underline-offset-4">
          {user.website.replace(/^https?:\/\//, "")}
        </a>
      )}
      <dl className="relative mt-[15px] py-1">
        <Fact shape="triangle" label="イキリポイント">{user.strength?.label ?? <Unset />}</Fact>
        <Fact shape="circle" label="残念な弱点">{user.weakness?.label ?? <Unset />}</Fact>
        <Fact shape="diamond" label="趣味3つ">
          {user.hobbies.length ? (
            <ul className="flex flex-wrap gap-1.5">{user.hobbies.map(h => <li key={h.id} className="rounded-[5px] bg-[#F6F3F8] px-2 py-[3px] text-[11px] leading-4">{h.label}</li>)}</ul>
          ) : <Unset />}
        </Fact>
      </dl>
    </section>
  )
}

function Unset() {
  return <span className="font-normal text-[#574B64]">未設定</span>
}

function Fact({ shape, label, children }: { shape: "triangle" | "circle" | "diamond"; label: string; children: React.ReactNode }) {
  const mark =
    shape === "triangle" ? <span className="mt-px block h-[18px] w-[18px] bg-accent" style={{ clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
      : shape === "circle" ? <span className="mt-px block h-[18px] w-[18px] rounded-full border-2 border-ink" />
        : <span className="ml-[3px] mr-[3px] mt-1 block h-3 w-3 rotate-45 bg-ink" />
  return (
    <div className="flex items-start gap-[11px] border-t border-profileline py-[11px] last:pb-0">
      <span aria-hidden className="shrink-0">{mark}</span>
      <div className="min-w-0">
        <dt className="mb-[3px] text-[10px] leading-[15px] text-[#574B64]">{label}</dt>
        <dd className="text-[13px] font-bold leading-5">{children}</dd>
      </div>
    </div>
  )
}
