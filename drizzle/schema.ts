import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    username: varchar("username", { length: 48 }).unique(),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    phone: varchar("phone", { length: 32 }).unique(),
    passwordHash: text("passwordHash"),
    accountType: mysqlEnum("accountType", ["designer", "client"])
      .default("client")
      .notNull(),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    bio: text("bio"),
    skills: text("skills"),
    experienceLevel: varchar("experienceLevel", { length: 32 }),
    avatarUrl: text("avatarUrl"),
    location: varchar("location", { length: 120 }),
    website: text("website"),
    availability: varchar("availability", { length: 120 }).default(
      "Available for projects"
    ),
    rating: int("rating").default(0).notNull(),
    reputation: int("reputation").default(0).notNull(),
    verified: boolean("verified").default(false).notNull(),
    isFirstUser: boolean("isFirstUser").default(false).notNull(),
    onboardingRating: boolean("onboardingRating").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => ({ typeIdx: index("users_account_type_idx").on(table.accountType) })
);

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 96 }).primaryKey(),
    userId: int("userId").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ userIdx: index("sessions_user_idx").on(table.userId) })
);
export const connectionRequests = mysqlTable(
  "connection_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    senderId: int("senderId").notNull(),
    receiverId: int("receiverId").notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "declined"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    pairIdx: uniqueIndex("connection_pair_idx").on(
      table.senderId,
      table.receiverId
    ),
    receiverIdx: index("connection_receiver_idx").on(table.receiverId),
  })
);
export const chats = mysqlTable("chats", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }),
  isCommunity: boolean("isCommunity").default(false).notNull(),
  adminOnly: boolean("adminOnly").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const chatMembers = mysqlTable(
  "chat_members",
  {
    id: int("id").autoincrement().primaryKey(),
    chatId: int("chatId").notNull(),
    userId: int("userId").notNull(),
    lastReadAt: timestamp("lastReadAt"),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  table => ({
    memberIdx: uniqueIndex("chat_member_idx").on(table.chatId, table.userId),
  })
);
export const messages = mysqlTable(
  "messages",
  {
    id: int("id").autoincrement().primaryKey(),
    chatId: int("chatId").notNull(),
    senderId: int("senderId").notNull(),
    body: text("body").notNull(),
    attachmentUrl: text("attachmentUrl"),
    attachmentName: varchar("attachmentName", { length: 255 }),
    attachmentType: varchar("attachmentType", { length: 120 }),
    replyToId: int("replyToId"),
    viewOnce: boolean("viewOnce").default(false).notNull(),
    viewedAt: timestamp("viewedAt"),
    editedAt: timestamp("editedAt"),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    chatIdx: index("messages_chat_idx").on(table.chatId, table.createdAt),
  })
);
export const portfolioProjects = mysqlTable(
  "portfolio_projects",
  {
    id: int("id").autoincrement().primaryKey(),
    designerId: int("designerId").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 80 }),
    coverUrl: text("coverUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    designerIdx: index("portfolio_designer_idx").on(table.designerId),
  })
);
export const posts = mysqlTable(
  "posts",
  {
    id: int("id").autoincrement().primaryKey(),
    authorId: int("authorId").notNull(),
    body: text("body").notNull(),
    imageUrl: text("imageUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ authorIdx: index("posts_author_idx").on(table.authorId) })
);
export const postLikes = mysqlTable(
  "post_likes",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId").notNull(),
    userId: int("userId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    likeIdx: uniqueIndex("post_like_idx").on(table.postId, table.userId),
  })
);
export const postComments = mysqlTable("post_comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  authorId: int("authorId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const projectRequests = mysqlTable("project_requests", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  designerId: int("designerId").notNull(),
  chatId: int("chatId"),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  service: varchar("service", { length: 120 }).notNull(),
  budget: varchar("budget", { length: 80 }),
  deadline: timestamp("deadline"),
  status: mysqlEnum("status", [
    "pending",
    "accepted",
    "in_progress",
    "completed",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    kind: varchar("kind", { length: 48 }).notNull(),
    body: text("body").notNull(),
    imageUrl: text("imageUrl"),
    targetType: varchar("targetType", { length: 48 }),
    targetId: int("targetId"),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userIdx: index("notifications_user_idx").on(table.userId, table.createdAt),
  })
);
export const statuses = mysqlTable(
  "statuses",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    body: text("body").notNull(),
    imageUrl: text("imageUrl"),
    viewCount: int("viewCount").default(0).notNull(),
    likeCount: int("likeCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
  },
  table => ({
    userIdx: index("statuses_user_idx").on(table.userId, table.expiresAt),
  })
);
export const statusViews = mysqlTable(
  "status_views",
  {
    id: int("id").autoincrement().primaryKey(),
    statusId: int("statusId").notNull(),
    viewerId: int("viewerId").notNull(),
    viewedAt: timestamp("viewedAt").defaultNow().notNull(),
  },
  table => ({
    viewIdx: uniqueIndex("status_view_idx").on(table.statusId, table.viewerId),
  })
);
export const statusLikes = mysqlTable(
  "status_likes",
  {
    id: int("id").autoincrement().primaryKey(),
    statusId: int("statusId").notNull(),
    userId: int("userId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    likeIdx: uniqueIndex("status_like_idx").on(table.statusId, table.userId),
  })
);
export const siteContent = mysqlTable("site_content", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
  updatedBy: int("updatedBy").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const challenges = mysqlTable("challenges", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  deadline: timestamp("deadline"),
  createdBy: int("createdBy").notNull(),
  status: mysqlEnum("challengeStatus", ["pending", "approved", "denied"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const challengeSubmissions = mysqlTable("challenge_submissions", {
  id: int("id").autoincrement().primaryKey(),
  challengeId: int("challengeId").notNull(),
  designerId: int("designerId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const reviews = mysqlTable(
  "reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    reviewerId: int("reviewerId").notNull(),
    designerId: int("designerId").notNull(),
    rating: int("rating").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    projectIdx: uniqueIndex("review_project_idx").on(table.projectId),
    designerIdx: index("review_designer_idx").on(table.designerId),
  })
);
export const availabilitySlots = mysqlTable(
  "availability_slots",
  {
    id: int("id").autoincrement().primaryKey(),
    designerId: int("designerId").notNull(),
    dayOfWeek: int("dayOfWeek").notNull(),
    startTime: varchar("startTime", { length: 8 }).notNull(),
    endTime: varchar("endTime", { length: 8 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
  },
  table => ({
    designerIdx: uniqueIndex("availability_designer_day_idx").on(
      table.designerId,
      table.dayOfWeek
    ),
  })
);
export const reports = mysqlTable(
  "reports",
  {
    id: int("id").autoincrement().primaryKey(),
    reporterId: int("reporterId").notNull(),
    targetType: mysqlEnum("targetType", [
      "user",
      "post",
      "message",
      "challenge",
    ]).notNull(),
    targetId: int("targetId").notNull(),
    reason: text("reason").notNull(),
    status: mysqlEnum("reportStatus", ["open", "reviewed", "resolved"])
      .default("open")
      .notNull(),
    resolvedBy: int("resolvedBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ statusIdx: index("reports_status_idx").on(table.status) })
);
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  credentialId: varchar("credentialId", { length: 255 }),
  publicKey: text("publicKey"),
  counter: int("counter").default(0).notNull(),
  transports: text("transports"),
  challenge: text("challenge"),
  recoveryHash: text("recoveryHash"),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const adminSessions = mysqlTable(
  "admin_sessions",
  {
    id: varchar("id", { length: 96 }).primaryKey(),
    userId: int("userId").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ userIdx: index("admin_sessions_user_idx").on(table.userId) })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
