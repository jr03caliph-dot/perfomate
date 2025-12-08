import { pgTable, text, uuid, timestamp, integer, numeric, boolean, date, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const mentors = pgTable("mentors", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  shortForm: text("short_form").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  rollNumber: text("roll_number").notNull(),
  class: text("class").notNull(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueRollClass: unique().on(table.rollNumber, table.class),
}));

export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tallies = pgTable("tallies", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  count: integer("count").default(0),
  fineAmount: numeric("fine_amount").default("0"),
  addedBy: uuid("added_by").references(() => mentors.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stars = pgTable("stars", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  count: integer("count").default(0),
  addedBy: uuid("added_by").references(() => mentors.id),
  source: text("source").default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otherTallies = pgTable("other_tallies", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  count: integer("count").default(0),
  fineAmount: numeric("fine_amount").default("0"),
  addedBy: uuid("added_by").references(() => mentors.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const morningBliss = pgTable("morning_bliss", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  class: text("class").notNull(),
  topic: text("topic").notNull(),
  score: numeric("score").notNull(),
  evaluatedBy: text("evaluated_by").notNull(),
  evaluatorId: uuid("evaluator_id").references(() => mentors.id),
  photoUrls: text("photo_urls").array().default([]),
  date: date("date").defaultNow(),
  isDailyWinner: boolean("is_daily_winner").default(false),
  isTopper: boolean("is_topper").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  class: text("class").notNull(),
  date: date("date").defaultNow(),
  status: text("status").notNull(),
  prayer: text("prayer"),
  reason: text("reason"),
  markedBy: uuid("marked_by").references(() => mentors.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueStudentDatePrayer: unique().on(table.studentId, table.date, table.prayer),
}));

export const attendanceArchive = pgTable("attendance_archive", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull(),
  class: text("class").notNull(),
  date: date("date").notNull(),
  status: text("status").notNull(),
  reason: text("reason"),
  markedBy: uuid("marked_by"),
  archivedAt: timestamp("archived_at").defaultNow(),
  originalMonth: text("original_month").notNull(),
});

export const voiceOfDirector = pgTable("voice_of_director", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const classReasons = pgTable("class_reasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  reason: text("reason").notNull(),
  tally: integer("tally").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const performanceReasons = pgTable("performance_reasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  reason: text("reason").notNull(),
  tally: integer("tally").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const starReasons = pgTable("star_reasons", {
  id: uuid("id").defaultRandom().primaryKey(),
  reason: text("reason").notNull(),
  stars: integer("stars").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tallyHistory = pgTable("tally_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  class: text("class").notNull(),
  mentorId: uuid("mentor_id").references(() => mentors.id),
  mentorShortForm: text("mentor_short_form").notNull(),
  type: text("type").notNull(),
  reason: text("reason"),
  tallyValue: integer("tally_value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const magazineScores = pgTable("magazine_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  class: text("class").notNull(),
  score: numeric("score").notNull(),
  maxScore: numeric("max_score").default("100"),
  date: date("date").defaultNow(),
  addedBy: uuid("added_by").references(() => mentors.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const mentorsRelations = relations(mentors, ({ many }) => ({
  tallies: many(tallies),
  stars: many(stars),
  otherTallies: many(otherTallies),
  morningBliss: many(morningBliss),
  attendance: many(attendance),
  tallyHistory: many(tallyHistory),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  tallies: many(tallies),
  stars: many(stars),
  otherTallies: many(otherTallies),
  morningBliss: many(morningBliss),
  attendance: many(attendance),
  tallyHistory: many(tallyHistory),
  magazineScores: many(magazineScores),
}));

export type Mentor = typeof mentors.$inferSelect;
export type InsertMentor = typeof mentors.$inferInsert;
export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type Tally = typeof tallies.$inferSelect;
export type Star = typeof stars.$inferSelect;
export type OtherTally = typeof otherTallies.$inferSelect;
export type MorningBliss = typeof morningBliss.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type AttendanceArchive = typeof attendanceArchive.$inferSelect;
export type VoiceOfDirector = typeof voiceOfDirector.$inferSelect;
export type ClassReason = typeof classReasons.$inferSelect;
export type PerformanceReason = typeof performanceReasons.$inferSelect;
export type StarReason = typeof starReasons.$inferSelect;
export type TallyHistory = typeof tallyHistory.$inferSelect;
export type MagazineScore = typeof magazineScores.$inferSelect;
