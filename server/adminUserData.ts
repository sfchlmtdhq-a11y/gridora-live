import { and, eq, inArray, ne, or } from "drizzle-orm";
import {
  adminSessions,
  adminUsers,
  availabilitySlots,
  challengeSubmissions,
  challenges,
  chatMembers,
  chats,
  connectionRequests,
  gridoraAiMessages,
  gridoraAiProfiles,
  gridoraAiThreads,
  messages,
  notifications,
  portfolioProjects,
  postComments,
  postLikes,
  posts,
  projectRequests,
  reports,
  reviews,
  sessions,
  siteContent,
  statuses,
  statusLikes,
  statusViews,
  userBlocks,
  users,
} from "../drizzle/schema";

type DbTransaction = any;

export async function eraseGridoraAccountData(
  tx: DbTransaction,
  userId: number,
  performedByAdminId: number
) {
  const ownedStatuses = await tx
    .select({ id: statuses.id })
    .from(statuses)
    .where(eq(statuses.userId, userId));
  const statusIds = ownedStatuses.map((row: { id: number }) => row.id);
  if (statusIds.length) {
    await tx.delete(statusLikes).where(inArray(statusLikes.statusId, statusIds));
    await tx.delete(statusViews).where(inArray(statusViews.statusId, statusIds));
    await tx.delete(statuses).where(inArray(statuses.id, statusIds));
  }
  await tx.delete(statusLikes).where(eq(statusLikes.userId, userId));
  await tx.delete(statusViews).where(eq(statusViews.viewerId, userId));

  const ownedPosts = await tx
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.authorId, userId));
  const postIds = ownedPosts.map((row: { id: number }) => row.id);
  if (postIds.length) {
    await tx.delete(postLikes).where(inArray(postLikes.postId, postIds));
    await tx.delete(postComments).where(inArray(postComments.postId, postIds));
    await tx.delete(posts).where(inArray(posts.id, postIds));
  }
  await tx.delete(postLikes).where(eq(postLikes.userId, userId));
  await tx.delete(postComments).where(eq(postComments.authorId, userId));

  const ownedMessages = await tx
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.senderId, userId));
  const messageIds = ownedMessages.map((row: { id: number }) => row.id);
  if (messageIds.length) {
    await tx
      .update(messages)
      .set({ replyToId: null })
      .where(
        and(ne(messages.senderId, userId), inArray(messages.replyToId, messageIds))
      );
    await tx.delete(messages).where(inArray(messages.id, messageIds));
  }
  const privateChats = await tx
    .select({ id: chats.id })
    .from(chatMembers)
    .innerJoin(chats, eq(chatMembers.chatId, chats.id))
    .where(
      and(
        eq(chatMembers.userId, userId),
        eq(chats.isCommunity, false),
        eq(chats.adminOnly, false)
      )
    );
  for (const chat of privateChats)
    await tx.update(chats).set({ title: "Conversation" }).where(eq(chats.id, chat.id));
  await tx.delete(chatMembers).where(eq(chatMembers.userId, userId));

  const ownedThreads = await tx
    .select({ id: gridoraAiThreads.id })
    .from(gridoraAiThreads)
    .where(eq(gridoraAiThreads.userId, userId));
  const threadIds = ownedThreads.map((row: { id: number }) => row.id);
  if (threadIds.length)
    await tx
      .delete(gridoraAiMessages)
      .where(inArray(gridoraAiMessages.threadId, threadIds));
  await tx.delete(gridoraAiMessages).where(eq(gridoraAiMessages.userId, userId));
  await tx.delete(gridoraAiThreads).where(eq(gridoraAiThreads.userId, userId));
  await tx.delete(gridoraAiProfiles).where(eq(gridoraAiProfiles.userId, userId));

  const ownedChallenges = await tx
    .select({ id: challenges.id })
    .from(challenges)
    .where(eq(challenges.createdBy, userId));
  const challengeIds = ownedChallenges.map((row: { id: number }) => row.id);
  if (challengeIds.length) {
    await tx
      .delete(challengeSubmissions)
      .where(inArray(challengeSubmissions.challengeId, challengeIds));
    await tx.delete(challenges).where(inArray(challenges.id, challengeIds));
  }
  await tx.delete(challengeSubmissions).where(eq(challengeSubmissions.designerId, userId));

  await tx.delete(connectionRequests).where(
    or(
      eq(connectionRequests.senderId, userId),
      eq(connectionRequests.receiverId, userId)
    )
  );
  await tx.delete(userBlocks).where(
    or(eq(userBlocks.userId, userId), eq(userBlocks.blockedUserId, userId))
  );
  await tx.delete(projectRequests).where(
    or(
      eq(projectRequests.clientId, userId),
      eq(projectRequests.designerId, userId)
    )
  );
  await tx.delete(reviews).where(
    or(eq(reviews.reviewerId, userId), eq(reviews.designerId, userId))
  );
  await tx.delete(portfolioProjects).where(eq(portfolioProjects.designerId, userId));
  await tx.delete(availabilitySlots).where(eq(availabilitySlots.designerId, userId));
  await tx.delete(notifications).where(
    or(
      eq(notifications.userId, userId),
      and(
        eq(notifications.targetType, "profile"),
        eq(notifications.targetId, userId)
      ),
      ...(statusIds.length
        ? [
            and(
              eq(notifications.targetType, "status"),
              inArray(notifications.targetId, statusIds)
            ),
          ]
        : []),
      ...(postIds.length
        ? [
            and(
              eq(notifications.targetType, "post"),
              inArray(notifications.targetId, postIds)
            ),
          ]
        : []),
      ...(messageIds.length
        ? [
            and(
              eq(notifications.targetType, "message"),
              inArray(notifications.targetId, messageIds)
            ),
          ]
        : []),
      ...(challengeIds.length
        ? [
            and(
              eq(notifications.targetType, "challenge"),
              inArray(notifications.targetId, challengeIds)
            ),
          ]
        : [])
    )
  );
  await tx.delete(reports).where(
    or(
      eq(reports.reporterId, userId),
      and(eq(reports.targetType, "user"), eq(reports.targetId, userId)),
      ...(postIds.length
        ? [and(eq(reports.targetType, "post"), inArray(reports.targetId, postIds))]
        : []),
      ...(messageIds.length
        ? [
            and(
              eq(reports.targetType, "message"),
              inArray(reports.targetId, messageIds)
            ),
          ]
        : []),
      ...(challengeIds.length
        ? [
            and(
              eq(reports.targetType, "challenge"),
              inArray(reports.targetId, challengeIds)
            ),
          ]
        : [])
    )
  );
  await tx.update(reports).set({ resolvedBy: null }).where(eq(reports.resolvedBy, userId));
  await tx.update(siteContent).set({ updatedBy: performedByAdminId }).where(eq(siteContent.updatedBy, userId));
  await tx.delete(adminSessions).where(eq(adminSessions.userId, userId));
  await tx.delete(adminUsers).where(eq(adminUsers.userId, userId));
  await tx.delete(sessions).where(eq(sessions.userId, userId));
  await tx.delete(users).where(eq(users.id, userId));
}
