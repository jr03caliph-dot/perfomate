import { Router } from "express";
import { db } from "../db";
import { classes } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const result = await db.select().from(classes).where(eq(classes.isActive, true));
    res.json(result);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const result = await db.select().from(classes);
    res.json(result);
  } catch (error) {
    console.error("Error fetching all classes:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Class name is required" });
    }

    const [newClass] = await db.insert(classes).values({
      name,
      isActive: true,
    }).returning();

    res.json(newClass);
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;

    const [updatedClass] = await db.update(classes)
      .set({
        name,
        isActive: is_active,
        updatedAt: new Date(),
      })
      .where(eq(classes.id, id))
      .returning();

    res.json(updatedClass);
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(500).json({ error: "Failed to update class" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(classes).where(eq(classes.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting class:", error);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

export default router;
