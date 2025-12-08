import { Router } from "express";
import { db } from "../db";
import { stars, tallyHistory, starReasons } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const { student_id } = req.query;
    
    if (student_id) {
      const result = await db.select().from(stars).where(eq(stars.studentId, student_id as string));
      return res.json(result);
    }

    const result = await db.select().from(stars);
    res.json(result);
  } catch (error) {
    console.error("Error fetching stars:", error);
    res.status(500).json({ error: "Failed to fetch stars" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { student_id, count, source, reason, mentor_short_form, class: className } = req.body;

    if (!student_id || count === undefined) {
      return res.status(400).json({ error: "Student ID and count are required" });
    }

    const existingStar = await db.select().from(stars).where(eq(stars.studentId, student_id));

    let result;
    if (existingStar.length > 0) {
      const [updated] = await db.update(stars)
        .set({
          count: sql`${stars.count} + ${count}`,
        })
        .where(eq(stars.studentId, student_id))
        .returning();
      result = updated;
    } else {
      const [newStar] = await db.insert(stars).values({
        studentId: student_id,
        count,
        source: source || 'manual',
        addedBy: req.session.mentorId,
      }).returning();
      result = newStar;
    }

    if (reason && className && mentor_short_form) {
      await db.insert(tallyHistory).values({
        studentId: student_id,
        class: className,
        mentorId: req.session.mentorId,
        mentorShortForm: mentor_short_form,
        type: 'star',
        reason,
        tallyValue: -count * 2,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Error creating star:", error);
    res.status(500).json({ error: "Failed to create star" });
  }
});

router.get("/reasons", async (req, res) => {
  try {
    const result = await db.select().from(starReasons);
    res.json(result);
  } catch (error) {
    console.error("Error fetching star reasons:", error);
    res.status(500).json({ error: "Failed to fetch star reasons" });
  }
});

router.post("/reasons", async (req, res) => {
  try {
    const { reason, stars: starCount } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const [newReason] = await db.insert(starReasons).values({
      reason,
      stars: starCount || 1,
    }).returning();

    res.json(newReason);
  } catch (error) {
    console.error("Error creating star reason:", error);
    res.status(500).json({ error: "Failed to create star reason" });
  }
});

export default router;
