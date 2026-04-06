import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get("/api/first-test", (req, res) => {
  console.log('First test endpoint reached!');
  res.json({ success: true, message: "First test working!" });
});

// Basic assets route
app.get("/api/assets", (req, res) => {
  console.log('Assets endpoint reached!');
  res.json([{ id: 1, propertyNumber: "TEST-001", description: "Test Asset" }]);
});

// Test PUT route
app.put("/api/test", (req, res) => {
  console.log('PUT test endpoint reached!');
  res.json({ success: true, message: "PUT test working!" });
});

// Start server
app.listen(4000, () => {
  console.log("Simple test server running on http://localhost:4000");
});
