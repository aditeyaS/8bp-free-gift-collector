import fs from "fs/promises";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

import { logger } from "./logger.js";

const rl = readline.createInterface({ input, output });

logger("success", "Enter your 8 ball pool unique id also for new user (Eg: 4722012226)");
const userUniqueID = await rl.question("");
rl.close();

await fs.writeFile("src/username.txt", userUniqueID);

await fs.rm("archive", { recursive: true });

const exampleReadme = await fs.readFile("README.example.md", "utf8");
await fs.writeFile("README.md", exampleReadme);

logger("success", "✅ Setup done. Enjoy!");
