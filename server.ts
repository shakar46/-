import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as googleSheets from "./server/googleSheets.ts";

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  
  // Google Sheets
  app.get("/api/gsheets/data", async (req, res) => {
    if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SPREADSHEET_ID) {
      try {
        const complaints = await googleSheets.getComplaints();
        res.json(complaints);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch from Google Sheets" });
      }
    } else {
      res.status(400).json({ error: "Google Sheets not configured" });
    }
  });

  // Sync Endpoints (to be called from frontend when Firestore updates)
  app.post("/api/gsheets/sync", async (req, res) => {
    const { action, data } = req.body;
    if (!process.env.GOOGLE_SPREADSHEET_ID) return res.status(400).json({ error: "Not configured" });

    try {
      if (action === "create") {
        await googleSheets.addComplaint(data);
      } else if (action === "update") {
        const row = await googleSheets.findRowById(data.id);
        if (row) await googleSheets.updateComplaint(row, data);
      } else if (action === "delete") {
        const row = await googleSheets.findRowById(data.id);
        if (row) await googleSheets.deleteComplaint(row);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Sync Error:", error);
      res.status(500).json({ error: "Sync failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
