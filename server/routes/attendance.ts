import { Router } from "express";
import { db } from "../db";
import { attendance, attendanceArchive } from "../../shared/schema";
import { eq, and, sql, gte, lte, SQL } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const { class: className, date, prayer, student_id } = req.query;
    
    const conditions: SQL[] = [];
    if (className) conditions.push(eq(attendance.class, className as string));
    if (date) conditions.push(eq(attendance.date, date as string));
    if (prayer) conditions.push(eq(attendance.prayer, prayer as string));
    if (student_id) conditions.push(eq(attendance.studentId, student_id as string));

    const result = await db.select().from(attendance)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    res.json(result);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

router.get("/by-date-range", async (req, res) => {
  try {
    const { class: className, start_date, end_date, prayer } = req.query;
    
    const conditions: SQL[] = [];
    if (className) conditions.push(eq(attendance.class, className as string));
    if (start_date) conditions.push(gte(attendance.date, start_date as string));
    if (end_date) conditions.push(lte(attendance.date, end_date as string));
    if (prayer) conditions.push(eq(attendance.prayer, prayer as string));

    const result = await db.select().from(attendance)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    res.json(result);
  } catch (error) {
    console.error("Error fetching attendance by date range:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { student_id, class: className, date, status, prayer, reason, marked_by } = req.body;

    if (!student_id || !className || !status) {
      return res.status(400).json({ error: "Student ID, class, and status are required" });
    }

    const dateValue = date || new Date().toISOString().split('T')[0];
    
    const existingAttendance = await db.select().from(attendance)
      .where(and(
        eq(attendance.studentId, student_id),
        eq(attendance.date, dateValue),
        prayer ? eq(attendance.prayer, prayer) : sql`${attendance.prayer} IS NULL`
      ));

    if (existingAttendance.length > 0) {
      const [updated] = await db.update(attendance)
        .set({ status, reason })
        .where(eq(attendance.id, existingAttendance[0].id))
        .returning();
      return res.json(updated);
    }

    const [newAttendance] = await db.insert(attendance).values({
      studentId: student_id,
      class: className,
      date: dateValue,
      status,
      prayer,
      reason,
      markedBy: marked_by || req.session.mentorId,
    }).returning();

    res.json(newAttendance);
  } catch (error) {
    console.error("Error creating attendance:", error);
    res.status(500).json({ error: "Failed to create attendance" });
  }
});

router.post("/bulk", async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: "Records array is required" });
    }

    const results: any[] = [];
    for (const record of records) {
      const { student_id, class: className, date, status, prayer, reason } = record;
      const dateValue = date || new Date().toISOString().split('T')[0];

      const existingAttendance = await db.select().from(attendance)
        .where(and(
          eq(attendance.studentId, student_id),
          eq(attendance.date, dateValue),
          prayer ? eq(attendance.prayer, prayer) : sql`${attendance.prayer} IS NULL`
        ));

      if (existingAttendance.length > 0) {
        const [updated] = await db.update(attendance)
          .set({ status, reason })
          .where(eq(attendance.id, existingAttendance[0].id))
          .returning();
        results.push(updated);
      } else {
        const [newRecord] = await db.insert(attendance).values({
          studentId: student_id,
          class: className,
          date: dateValue,
          status,
          prayer,
          reason,
          markedBy: req.session.mentorId,
        }).returning();
        results.push(newRecord);
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Error creating bulk attendance:", error);
    res.status(500).json({ error: "Failed to create attendance records" });
  }
});

router.get("/archive", async (req, res) => {
  try {
    const { class: className, original_month } = req.query;
    
    const conditions: SQL[] = [];
    if (className) conditions.push(eq(attendanceArchive.class, className as string));
    if (original_month) conditions.push(eq(attendanceArchive.originalMonth, original_month as string));

    const result = await db.select().from(attendanceArchive)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    res.json(result);
  } catch (error) {
    console.error("Error fetching attendance archive:", error);
    res.status(500).json({ error: "Failed to fetch attendance archive" });
  }
});

export default router;
