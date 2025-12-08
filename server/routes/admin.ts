import { Router } from "express";
import { db } from "../db";
import { 
  voiceOfDirector, 
  classReasons, 
  performanceReasons, 
  starReasons,
  tallies,
  stars,
  otherTallies,
  attendance,
  attendanceArchive,
  classes,
  mentors
} from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/voice-of-director", async (req, res) => {
  try {
    const result = await db.select().from(voiceOfDirector).orderBy(sql`${voiceOfDirector.createdAt} DESC`);
    res.json(result);
  } catch (error) {
    console.error("Error fetching voice of director:", error);
    res.status(500).json({ error: "Failed to fetch voice of director" });
  }
});

router.post("/voice-of-director", async (req, res) => {
  try {
    const { title, message } = req.body;

    const [result] = await db.insert(voiceOfDirector).values({
      title,
      message,
    }).returning();

    res.json(result);
  } catch (error) {
    console.error("Error creating voice of director message:", error);
    res.status(500).json({ error: "Failed to create voice of director message" });
  }
});

router.delete("/voice-of-director/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(voiceOfDirector).where(eq(voiceOfDirector.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting voice of director message:", error);
    res.status(500).json({ error: "Failed to delete voice of director message" });
  }
});

router.get("/reasons/class", async (req, res) => {
  try {
    const result = await db.select().from(classReasons);
    res.json(result);
  } catch (error) {
    console.error("Error fetching class reasons:", error);
    res.status(500).json({ error: "Failed to fetch class reasons" });
  }
});

router.post("/reasons/class", async (req, res) => {
  try {
    const { reason, tally } = req.body;

    const [newReason] = await db.insert(classReasons).values({
      reason,
      tally: tally || 1,
    }).returning();

    res.json(newReason);
  } catch (error) {
    console.error("Error creating class reason:", error);
    res.status(500).json({ error: "Failed to create class reason" });
  }
});

router.delete("/reasons/class/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(classReasons).where(eq(classReasons.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting class reason:", error);
    res.status(500).json({ error: "Failed to delete class reason" });
  }
});

router.get("/reasons/performance", async (req, res) => {
  try {
    const result = await db.select().from(performanceReasons);
    res.json(result);
  } catch (error) {
    console.error("Error fetching performance reasons:", error);
    res.status(500).json({ error: "Failed to fetch performance reasons" });
  }
});

router.post("/reasons/performance", async (req, res) => {
  try {
    const { reason, tally } = req.body;

    const [newReason] = await db.insert(performanceReasons).values({
      reason,
      tally: tally || 1,
    }).returning();

    res.json(newReason);
  } catch (error) {
    console.error("Error creating performance reason:", error);
    res.status(500).json({ error: "Failed to create performance reason" });
  }
});

router.delete("/reasons/performance/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(performanceReasons).where(eq(performanceReasons.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting performance reason:", error);
    res.status(500).json({ error: "Failed to delete performance reason" });
  }
});

router.get("/reasons/star", async (req, res) => {
  try {
    const result = await db.select().from(starReasons);
    res.json(result);
  } catch (error) {
    console.error("Error fetching star reasons:", error);
    res.status(500).json({ error: "Failed to fetch star reasons" });
  }
});

router.post("/reasons/star", async (req, res) => {
  try {
    const { reason, stars: starCount } = req.body;

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

router.delete("/reasons/star/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(starReasons).where(eq(starReasons.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting star reason:", error);
    res.status(500).json({ error: "Failed to delete star reason" });
  }
});

router.post("/reset-monthly", async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const attendanceData = await db.select().from(attendance);
    
    if (attendanceData.length > 0) {
      const archiveRecords = attendanceData
        .filter(record => record.date !== null)
        .map(record => ({
          studentId: record.studentId,
          class: record.class,
          date: record.date as string,
          status: record.status,
          reason: record.reason,
          markedBy: record.markedBy,
          originalMonth: currentMonth,
        }));

      if (archiveRecords.length > 0) {
        await db.insert(attendanceArchive).values(archiveRecords);
      }

      await db.delete(attendance);
    }

    await db.update(tallies).set({ count: 0, fineAmount: "0" });
    await db.update(stars).set({ count: 0 });
    await db.update(otherTallies).set({ count: 0, fineAmount: "0" });

    res.json({ success: true, message: "Monthly reset completed" });
  } catch (error) {
    console.error("Error during monthly reset:", error);
    res.status(500).json({ error: "Failed to perform monthly reset" });
  }
});

router.post("/seed-classes", async (req, res) => {
  try {
    const defaultClasses = ['JCP3', 'S2A', 'S2B', 'C2A', 'C2B', 'S1A', 'S1B', 'C1A', 'C1B', 'C1C'];
    
    for (const className of defaultClasses) {
      const existing = await db.select().from(classes).where(eq(classes.name, className));
      if (existing.length === 0) {
        await db.insert(classes).values({ name: className, isActive: true });
      }
    }

    const result = await db.select().from(classes);
    res.json(result);
  } catch (error) {
    console.error("Error seeding classes:", error);
    res.status(500).json({ error: "Failed to seed classes" });
  }
});

router.get("/mentors", async (req, res) => {
  try {
    const result = await db.select({
      id: mentors.id,
      email: mentors.email,
      fullName: mentors.fullName,
      shortForm: mentors.shortForm,
      createdAt: mentors.createdAt,
    }).from(mentors);
    res.json(result);
  } catch (error) {
    console.error("Error fetching mentors:", error);
    res.status(500).json({ error: "Failed to fetch mentors" });
  }
});

router.delete("/mentors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(mentors).where(eq(mentors.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting mentor:", error);
    res.status(500).json({ error: "Failed to delete mentor" });
  }
});

export default router;
