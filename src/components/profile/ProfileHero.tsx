"use client"

import Link from "next/link"
import { Avatar } from "@/components/ui/Avatar"
import { Icon } from "@/components/ui/Icon"
import { formatCount } from "@/lib/client/format"
import type { PublicUser } from "@/lib/dto/user"

type HeroUser = Pick<PublicUser, "id" | "name" | "username" | "avatar" | "bio" | "website" | "strength" | "weakness" | "hobbies" | "isPrivate"> & { counts?: PublicUser["counts"] }

// Priority: avatar + name → numbers (one compact line) → bio → the three DayNet facts. No panel
// around it; the facts are a quiet definition list so the posts below come into view early.
export function ProfileHero({ user, actions }: { user: HeroUser; actions?: React.ReactNode }) {
  // One DOM, two arrangements: phones put the avatar beside the name and stack the rest below;
  // desktop keeps the avatar in its own column with name → actions → facts to its right.
  return (
    <section aria-labelledby="profile-name" className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 px-[var(--gutter)] pt-3 desktop:grid-cols-[246px_minmax(0,1fr)] desktop:gap-x-8 desktop:px-0 desktop:pt-8">
      <div className="self-center desktop:row-span-3 desktop:self-start desktop:justify-self-center">
        <span className="desktop:hidden"><Avatar user={user} size={84} decorative={false} /></span>
        <span className="hidden desktop:block" aria-hidden><Avatar user={user} size={150} /></span>
      </div>
      <div className="min-w-0 self-center">
        <h1 id="profile-name" className="line-clamp-2 text-[22px] font-bold leading-[1.35] tracking-[-0.02em] desktop:text-[26px]">{user.name || user.username}</h1>
        <p className="flex items-center gap-1.5 text-muted">
          <span className="t-label truncate text-[17px] leading-[1.4]">@{user.username}</span>
          {user.isPrivate && <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px]"><Icon name="lock" size={14} />非公開</span>}
        </p>
        {user.counts && (
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {([["投稿", user.counts.posts], ["フォロワー", user.counts.followers], ["フォロー", user.counts.following]] as const).map(([label, n]) => (
              <div key={label} className="flex flex-row-reverse items-baseline justify-end gap-1">
                <dt className="text-[13px] text-muted">{label}</dt>
                <dd className="t-count">{formatCount(n)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {actions && <div className="col-span-2 row-start-3 mt-4 desktop:col-span-1 desktop:col-start-2 desktop:row-start-2">{actions}</div>}
      <div className="col-span-2 row-start-2 desktop:col-span-1 desktop:col-start-2 desktop:row-start-3"><About user={user} /></div>
    </section>
  )
}

function About({ user }: { user: HeroUser }) {
  return (
    <>
      {user.bio && <p className="mt-3 whitespace-pre-wrap t-small">{user.bio}</p>}
      {user.website && (
        <a href={user.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="mt-1 inline-flex max-w-full items-center gap-1 t-small font-medium text-ink hover:underline">
          <Icon name="globe" size={16} /><span className="truncate">{user.website.replace(/^https?:\/\//, "")}</span>
        </a>
      )}
      <dl className="mt-3 divide-y divide-line border-y border-line">
        <Fact shape="triangle" label="イキリポイント">{user.strength?.label ?? <Unset />}</Fact>
        <Fact shape="circle" label="残念な弱点">{user.weakness?.label ?? <Unset />}</Fact>
        <Fact shape="diamond" label="趣味3つ">
          {user.hobbies.length ? (
            <ul className="flex flex-wrap">{user.hobbies.map((h, i) => <li key={h.id}>{i > 0 && <span aria-hidden className="mx-1.5 text-muted">·</span>}<Link href={`/explore?q=${encodeURIComponent(h.label)}`} className="-my-3 inline-block py-3 hover:underline">{h.label}</Link></li>)}</ul>
          ) : <Unset />}
        </Fact>
      </dl>
    </>
  )
}

function Unset() {
  return <span className="font-normal text-muted">未設定</span>
}

// The three DayNet markers stay (triangle / circle / diamond) but small, as list bullets.
function Fact({ shape, label, children }: { shape: "triangle" | "circle" | "diamond"; label: string; children: React.ReactNode }) {
  const mark =
    shape === "triangle" ? <span className="block h-[10px] w-[11px] bg-accent" style={{ clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
      : shape === "circle" ? <span className="block h-[10px] w-[10px] rounded-full border-[1.75px] border-ink" />
        : <span className="block h-[8px] w-[8px] rotate-45 bg-ink" />
  return (
    <div className="flex items-baseline gap-3 py-2">
      <span aria-hidden className="flex w-3 shrink-0 justify-center self-center">{mark}</span>
      <dt className="w-[7.5em] shrink-0 text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-[15px] font-medium leading-[1.5]">{children}</dd>
    </div>
  )
}
