-- DayNet v4: additive schema changes + backfills.
-- Generated with `prisma migrate diff` and then edited by hand:
--   * CommunityMember.role is converted in place (no DROP COLUMN).
--   * CHECK constraints / append-only trigger that Prisma cannot express.
--   * Idempotent backfills for existing rows (Post.publishedAt/kind/visibility,
--     legacy Media from Post.images, Conversation.pairKey, Follow.acceptedAt).
-- No existing row is deleted. See MIGRATION_RUNBOOK.txt.

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "DmPolicy" AS ENUM ('MUTUAL_OR_REQUEST', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "ProfileOptionKind" AS ENUM ('STRENGTH', 'WEAKNESS', 'HOBBY');

-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('NOTE', 'PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'DELETING');

-- CreateEnum
CREATE TYPE "MediaPurpose" AS ENUM ('POST', 'AVATAR');

-- CreateEnum
CREATE TYPE "UploadSessionState" AS ENUM ('OPEN', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "ConversationState" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('POST', 'COMMENT', 'USER', 'MESSAGE');

-- CreateEnum
CREATE TYPE "ReportState" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "hiddenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CommunityMember" ADD COLUMN     "showOnProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE';
-- Explicit, lossless role mapping (old free-text values -> enum). No column is dropped.
ALTER TABLE "CommunityMember" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "CommunityMember" ALTER COLUMN "role" TYPE "MemberRole" USING (
  CASE lower(trim("role"))
    WHEN 'owner' THEN 'OWNER'::"MemberRole"
    WHEN 'moderator' THEN 'MODERATOR'::"MemberRole"
    WHEN 'mod' THEN 'MODERATOR'::"MemberRole"
    WHEN 'admin' THEN 'MODERATOR'::"MemberRole"
    ELSE 'MEMBER'::"MemberRole"
  END
);
ALTER TABLE "CommunityMember" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "initiatorId" TEXT,
ADD COLUMN     "pairKey" TEXT,
ADD COLUMN     "state" "ConversationState" NOT NULL DEFAULT 'ACCEPTED';

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "lastReadAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "clientMessageId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Follow" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "status" "FollowStatus" NOT NULL DEFAULT 'ACCEPTED';

-- AlterTable
ALTER TABLE "Footprint" ADD COLUMN     "visitDay" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "kind" "PostKind" NOT NULL DEFAULT 'NOTE',
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarMediaId" TEXT,
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "dmPolicy" "DmPolicy" NOT NULL DEFAULT 'MUTUAL_OR_REQUEST',
ADD COLUMN     "footprintOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "strengthOptionId" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "weaknessOptionId" TEXT;

-- CreateTable
CREATE TABLE "ProfileOption" (
    "id" TEXT NOT NULL,
    "kind" "ProfileOptionKind" NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHobby" (
    "userId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "UserHobby_pkey" PRIMARY KEY ("userId","optionId")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "postId" TEXT,
    "purpose" "MediaPurpose" NOT NULL DEFAULT 'POST',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "kind" "MediaKind" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'cloudinary',
    "providerAssetId" TEXT,
    "providerPublicId" TEXT,
    "resourceType" TEXT,
    "deliveryType" TEXT,
    "version" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "bytes" INTEGER,
    "format" TEXT,
    "altText" TEXT,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "legacyUrl" TEXT,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "state" "UploadSessionState" NOT NULL DEFAULT 'OPEN',
    "expectedKind" "MediaKind" NOT NULL,
    "maxBytes" INTEGER NOT NULL,
    "providerPublicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empathy" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empathy_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "Block" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateTable
CREATE TABLE "Mute" (
    "userId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mute_pkey" PRIMARY KEY ("userId","targetUserId")
);

-- CreateTable
CREATE TABLE "CommunityMute" (
    "userId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMute_pkey" PRIMARY KEY ("userId","communityId")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "detail" TEXT,
    "state" "ReportState" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("userId","scope","key")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MediaDeletionJob" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT,
    "provider" TEXT NOT NULL,
    "providerPublicId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "deliveryType" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaDeletionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileOption_kind_active_sortOrder_idx" ON "ProfileOption"("kind", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileOption_kind_label_key" ON "ProfileOption"("kind", "label");

-- CreateIndex
CREATE UNIQUE INDEX "UserHobby_userId_position_key" ON "UserHobby"("userId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Media_providerPublicId_key" ON "Media"("providerPublicId");

-- CreateIndex
CREATE INDEX "Media_postId_sortOrder_idx" ON "Media"("postId", "sortOrder");

-- CreateIndex
CREATE INDEX "Media_ownerId_status_createdAt_idx" ON "Media"("ownerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Media_status_createdAt_idx" ON "Media"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UploadSession_mediaId_key" ON "UploadSession"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadSession_providerPublicId_key" ON "UploadSession"("providerPublicId");

-- CreateIndex
CREATE INDEX "UploadSession_ownerId_createdAt_idx" ON "UploadSession"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_receivedAt_idx" ON "WebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "Empathy_postId_idx" ON "Empathy"("postId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");

-- CreateIndex
CREATE INDEX "Report_state_createdAt_idx" ON "Report"("state", "createdAt");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ModerationAction_targetType_targetId_createdAt_idx" ON "ModerationAction"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE INDEX "MediaDeletionJob_doneAt_nextAttemptAt_idx" ON "MediaDeletionJob"("doneAt", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityMember_communityId_status_idx" ON "CommunityMember"("communityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_pairKey_key" ON "Conversation"("pairKey");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_createdAt_id_idx" ON "DirectMessage"("conversationId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessage_senderId_clientMessageId_key" ON "DirectMessage"("senderId", "clientMessageId");

-- CreateIndex
CREATE INDEX "Follow_followingId_status_idx" ON "Follow"("followingId", "status");

-- CreateIndex
CREATE INDEX "Footprint_visitedId_visitedAt_idx" ON "Footprint"("visitedId", "visitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Footprint_visitorId_visitedId_visitDay_key" ON "Footprint"("visitorId", "visitedId", "visitDay");

-- CreateIndex
CREATE INDEX "Like_postId_idx" ON "Like"("postId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_id_idx" ON "Notification"("userId", "read", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Post_publishedAt_id_idx" ON "Post"("publishedAt", "id");

-- CreateIndex
CREATE INDEX "Post_userId_publishedAt_id_idx" ON "Post"("userId", "publishedAt", "id");

-- CreateIndex
CREATE INDEX "Post_communityId_publishedAt_id_idx" ON "Post"("communityId", "publishedAt", "id");

-- CreateIndex
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarMediaId_key" ON "User"("avatarMediaId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_strengthOptionId_fkey" FOREIGN KEY ("strengthOptionId") REFERENCES "ProfileOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_weaknessOptionId_fkey" FOREIGN KEY ("weaknessOptionId") REFERENCES "ProfileOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHobby" ADD CONSTRAINT "UserHobby_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHobby" ADD CONSTRAINT "UserHobby_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProfileOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empathy" ADD CONSTRAINT "Empathy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empathy" ADD CONSTRAINT "Empathy_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mute" ADD CONSTRAINT "Mute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mute" ADD CONSTRAINT "Mute_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMute" ADD CONSTRAINT "CommunityMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMute" ADD CONSTRAINT "CommunityMute_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Constraints Prisma cannot express
-- ---------------------------------------------------------------------------
ALTER TABLE "UserHobby" ADD CONSTRAINT "UserHobby_position_range" CHECK ("position" BETWEEN 0 AND 2);
ALTER TABLE "Report" ADD CONSTRAINT "Report_detail_length" CHECK ("detail" IS NULL OR char_length("detail") <= 1000);
-- A post that belongs to a community must use COMMUNITY visibility.
-- (Personal posts may not choose COMMUNITY; enforced in the API and treated as owner-only by the ACL.)
ALTER TABLE "Post" ADD CONSTRAINT "Post_community_visibility" CHECK ("communityId" IS NULL OR "visibility" = 'COMMUNITY');
ALTER TABLE "Post" ADD CONSTRAINT "Post_revision_nonnegative" CHECK ("revision" >= 0);
ALTER TABLE "Media" ADD CONSTRAINT "Media_sortOrder_range" CHECK ("sortOrder" BETWEEN 0 AND 4);
ALTER TABLE "Block" ADD CONSTRAINT "Block_not_self" CHECK ("blockerId" <> "blockedId");
ALTER TABLE "Mute" ADD CONSTRAINT "Mute_not_self" CHECK ("userId" <> "targetUserId");
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_not_self" CHECK ("followerId" <> "followingId") NOT VALID;

-- ModerationAction is an immutable audit log.
CREATE OR REPLACE FUNCTION daynet_moderation_action_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ModerationAction is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ModerationAction_no_update_delete"
  BEFORE UPDATE OR DELETE ON "ModerationAction"
  FOR EACH ROW EXECUTE FUNCTION daynet_moderation_action_immutable();

-- ---------------------------------------------------------------------------
-- Backfills (idempotent; safe to re-run)
-- ---------------------------------------------------------------------------
-- Existing posts were published at creation time; publishedAt is fixed and never changed by edits.
UPDATE "Post" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL AND "status" = 'PUBLISHED';
-- Community posts become COMMUNITY visibility (community is the source of truth for visibility).
UPDATE "Post" SET "visibility" = 'COMMUNITY' WHERE "communityId" IS NOT NULL AND "visibility" <> 'COMMUNITY';

-- Tolerant JSON parse for the legacy TEXT column Post.images.
CREATE OR REPLACE FUNCTION daynet_try_jsonb(t text) RETURNS jsonb AS $$
BEGIN
  RETURN t::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Legacy images -> Media rows (provider 'legacy-url'). Original URL kept internally in Media.legacyUrl.
INSERT INTO "Media" ("id", "ownerId", "postId", "purpose", "sortOrder", "kind", "provider", "deliveryType", "status", "legacyUrl", "createdAt", "updatedAt")
SELECT 'lgcy_' || md5(p."id" || ':' || (e.ord - 1)::text),
       p."userId", p."id", 'POST', (e.ord - 1)::int, 'IMAGE', 'legacy-url', 'upload', 'READY', e.url, p."createdAt", CURRENT_TIMESTAMP
FROM "Post" p
CROSS JOIN LATERAL (
  SELECT value AS url, ordinality AS ord
  FROM jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(daynet_try_jsonb(p."images")) = 'array' THEN daynet_try_jsonb(p."images") ELSE '[]'::jsonb END
  ) WITH ORDINALITY
) e
WHERE e.ord <= 5 AND e.url ~* '^https?://'
ON CONFLICT ("id") DO NOTHING;

UPDATE "Post" p SET "kind" = 'PHOTO'
WHERE p."kind" = 'NOTE' AND EXISTS (SELECT 1 FROM "Media" m WHERE m."postId" = p."id" AND m."kind" = 'IMAGE');

-- Existing follows were all effectively accepted.
UPDATE "Follow" SET "acceptedAt" = "createdAt" WHERE "status" = 'ACCEPTED' AND "acceptedAt" IS NULL;

-- Conversation.pairKey for conversations with exactly two distinct participants.
-- If legacy data contains several conversations for the same pair, only the oldest receives the
-- pairKey; the others keep NULL (still readable by their participants) and are listed by
-- `npm run db:report-duplicates` for a manual merge decision. Nothing is deleted here.
WITH pairs AS (
  SELECT cp."conversationId",
         min(cp."userId") || ':' || max(cp."userId") AS pair_key,
         count(DISTINCT cp."userId") AS n
  FROM "ConversationParticipant" cp
  GROUP BY cp."conversationId"
), ranked AS (
  SELECT p."conversationId", p.pair_key,
         row_number() OVER (PARTITION BY p.pair_key ORDER BY c."createdAt", c."id") AS rn
  FROM pairs p JOIN "Conversation" c ON c."id" = p."conversationId"
  WHERE p.n = 2
)
UPDATE "Conversation" c SET "pairKey" = r.pair_key
FROM ranked r
WHERE c."id" = r."conversationId" AND r.rn = 1 AND c."pairKey" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Conversation" c2 WHERE c2."pairKey" = r.pair_key);

