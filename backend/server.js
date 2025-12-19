require("dotenv").config();
const { createServer } = require("./src/app");

const PORT = process.env.PORT || 3000;
const app = createServer();
const cors = require("cors");
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: false }));

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
