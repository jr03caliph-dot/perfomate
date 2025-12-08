import { Router } from "express";
import { db } from "../db";
import { morningBliss, stars } from "../../shared/schema";
import { eq, and, sql, gte, lte, desc, SQL } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const { class: className, date, student_id, start_date, end_date } = req.query;
    
    const conditions: SQL[] = [];
    if (className) conditions.push(eq(morningBliss.class, className as string));
    if (date) conditions.push(eq(morningBliss.date, date as string));
    if (student_id) conditions.push(eq(morningBliss.studentId, student_id as string));
    if (start_date) conditions.push(gte(morningBliss.date, start_date as string));
    if (end_date) conditions.push(lte(morningBliss.date, end_date as string));

    const result = await db.select().from(morningBliss)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(morningBliss.date));
    res.json(result);
  } catch (error) {
    console.error("Error fetching morning bliss:", error);
    res.status(500).json({ error: "Failed to fetch morning bliss records" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { 
      student_id, 
      class: className, 
      topic, 
      score, 
      evaluated_by, 
      photo_urls, 
      date,
      is_daily_winner,
      is_topper 
    } = req.body;

    if (!student_id || !className || !topic || score === undefined || !evaluated_by) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const numericScore = Number(score);
    const autoIsTopper = numericScore >= 9.5;

    const [newRecord] = await db.insert(morningBliss).values({
      studentId: student_id,
      class: className,
      topic,
      score: String(score),
      evaluatedBy: evaluated_by,
      evaluatorId: req.session.mentorId,
      photoUrls: photo_urls || [],
      date: date || new Date().toISOString().split('T')[0],
      isDailyWinner: is_daily_winner || false,
      isTopper: is_topper !== undefined ? is_topper : autoIsTopper,
    }).returning();

    if (numericScore >= 9) {
      const starCount = numericScore >= 9.5 ? 2 : 1;
      
      const existingStar = await db.select().from(stars).where(eq(stars.studentId, student_id));
      
      if (existingStar.length > 0) {
        await db.update(stars)
          .set({ count: sql`${stars.count} + ${starCount}` })
          .where(eq(stars.studentId, student_id));
      } else {
        await db.insert(stars).values({
          studentId: student_id,
          count: starCount,
          source: 'morning_bliss',
          addedBy: req.session.mentorId,
        });
      }
    }

    res.json(newRecord);
  } catch (error) {
    console.error("Error creating morning bliss:", error);
    res.status(500).json({ error: "Failed to create morning bliss record" });
  }
});

router.put("/:id/winner", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_daily_winner } = req.body;

    const [updated] = await db.update(morningBliss)
      .set({ isDailyWinner: is_daily_winner })
      .where(eq(morningBliss.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating winner status:", error);
    res.status(500).json({ error: "Failed to update winner status" });
  }
});

router.get("/toppers", async (req, res) => {
  try {
    const { start_date, end_date, class: className } = req.query;
    
    const conditions: SQL[] = [eq(morningBliss.isTopper, true)];
    if (className) conditions.push(eq(morningBliss.class, className as string));
    if (start_date) conditions.push(gte(morningBliss.date, start_date as string));
    if (end_date) conditions.push(lte(morningBliss.date, end_date as string));

    const result = await db.select().from(morningBliss)
      .where(and(...conditions))
      .orderBy(desc(morningBliss.score));
    res.json(result);
  } catch (error) {
    console.error("Error fetching toppers:", error);
    res.status(500).json({ error: "Failed to fetch toppers" });
  }
});

export default router;
