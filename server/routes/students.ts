import { Router } from "express";
import { db } from "../db";
import { students, tallies, stars, otherTallies, tallyHistory } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const { class: className } = req.query;
    
    let query = db.select().from(students);
    if (className) {
      query = query.where(eq(students.class, className as string)) as any;
    }
    
    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

router.get("/with-stats", async (req, res) => {
  try {
    const { class: className } = req.query;
    
    const studentsResult = await db.select().from(students)
      .where(className ? eq(students.class, className as string) : undefined);
    
    const studentsWithStats = await Promise.all(studentsResult.map(async (student) => {
      const [tallyData] = await db.select({ total: sql<number>`COALESCE(SUM(${tallies.count}), 0)` })
        .from(tallies).where(eq(tallies.studentId, student.id));
      
      const [starData] = await db.select({ total: sql<number>`COALESCE(SUM(${stars.count}), 0)` })
        .from(stars).where(eq(stars.studentId, student.id));
      
      const [otherTallyData] = await db.select({ total: sql<number>`COALESCE(SUM(${otherTallies.count}), 0)` })
        .from(otherTallies).where(eq(otherTallies.studentId, student.id));

      const tallyCount = Number(tallyData?.total || 0);
      const starCount = Number(starData?.total || 0);
      const otherTallyCount = Number(otherTallyData?.total || 0);
      
      const netTallies = Math.max(0, tallyCount - (starCount * 2));
      const fineAmount = netTallies * 10;
      const otherFineAmount = otherTallyCount * 10;

      return {
        ...student,
        tallies: tallyCount,
        stars: starCount,
        other_tallies: otherTallyCount,
        net_tallies: netTallies,
        fine_amount: fineAmount,
        other_fine_amount: otherFineAmount,
      };
    }));

    res.json(studentsWithStats);
  } catch (error) {
    console.error("Error fetching students with stats:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, roll_number, class: className, photo_url } = req.body;

    if (!name || !roll_number || !className) {
      return res.status(400).json({ error: "Name, roll number, and class are required" });
    }

    const [newStudent] = await db.insert(students).values({
      name,
      rollNumber: roll_number,
      class: className,
      photoUrl: photo_url,
    }).returning();

    res.json(newStudent);
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({ error: "Failed to create student" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, roll_number, class: className, photo_url } = req.body;

    const [updatedStudent] = await db.update(students)
      .set({
        name,
        rollNumber: roll_number,
        class: className,
        photoUrl: photo_url,
      })
      .where(eq(students.id, id))
      .returning();

    res.json(updatedStudent);
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ error: "Failed to update student" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(students).where(eq(students.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    const history = await db.select().from(tallyHistory)
      .where(eq(tallyHistory.studentId, id))
      .orderBy(sql`${tallyHistory.createdAt} DESC`);
    res.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default router;
