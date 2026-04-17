import { io as Client } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./types";

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runVerify() {
  console.log("Starting verification...");

  const client1: Socket<ServerToClientEvents, ClientToServerEvents> =
    Client(URL);
  const client2: Socket<ServerToClientEvents, ClientToServerEvents> =
    Client(URL);

  const user1 = "user-1";
  const user2 = "user-2";
  const room = "test-room";

  let client1Connected = false;
  let client2Connected = false;

  client1.on("connect", () => {
    console.log("Client 1 connected");
    client1Connected = true;
    client1.emit("join-room", room, user1, "host", "User 1", true);
  });

  client2.on("connect", () => {
    console.log("Client 2 connected");
    client2Connected = true;
    client2.emit("join-room", room, user2, "participant", "User 2", true);
  });

  // Verify "user-connected"
  const userConnectedPromise = new Promise<void>((resolve) => {
    client1.on("user-connected", (userId) => {
      console.log(`Client 1 received user-connected: ${userId}`);
      if (userId === user2) resolve();
    });
  });

  await sleep(1000); // Wait for connection

  if (!client1Connected || !client2Connected) {
    console.error("Clients did not connect");
    process.exit(1);
  }

  // Verify signaling
  const offerPromise = new Promise<void>((resolve) => {
    client2.on("offer", (offer, fromUserId) => {
      console.log(`Client 2 received offer from ${fromUserId}`);
      if (fromUserId === user1 && offer.type === "offer") resolve();
    });
  });

  // Client 1 sends offer to Client 2
  // Note: user-connected must happen first so server knows user2 is in the room?
  // No, actually my server code iterates sockets. If client2 is connected and joined, it should be found.

  await userConnectedPromise; // Wait for them to see each other
  console.log("Clients are in the room.");

  client1.emit("offer", { type: "offer", sdp: "fake-sdp" }, user2);

  await offerPromise;
  console.log("Offer verification successful!");

  client1.disconnect();
  client2.disconnect();
  console.log("Verification Passed.");
  process.exit(0);
}

runVerify().catch((err) => {
  console.error(err);
  process.exit(1);
});
