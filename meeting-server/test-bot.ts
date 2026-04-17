import { recorderBot } from "./recorder";

async function test() {
  console.log("RecorderBot imported successfully");
  if (recorderBot) {
    console.log("RecorderBot instance exists");
  }
}

test().catch(console.error);
