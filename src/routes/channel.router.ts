import { Request, Response, Router } from "express";

import prisma from "@/lib/prisma";
import { redisConnection } from "@/lib/redis";

import type { Broadcast } from "../../typings";

const channelRouter = Router();

channelRouter.get("/live", async (req: Request, res: Response) => {
  const reply = await redisConnection.SCAN(0, {
    MATCH: "channel:*",
    COUNT: 10,
  });

  const keys = reply.keys;
  const broadcasts = await Promise.all(
    keys.map(async (key) => {
      const broadcastWithviewers = await redisConnection.HGETALL(key);
      const broadcast = JSON.parse(broadcastWithviewers.broadcast) as Broadcast;
      const viewers = Number(broadcastWithviewers.viewers);
      return { ...broadcast, viewers };
    }),
  );

  res.json({ data: broadcasts });
});

channelRouter.get("/:channelId", async (req: Request, res: Response) => {
  const { channelId } = req.params;

  if (!channelId) {
    return res.status(400).json({ message: "channelId is required" });
  }

  try {
    const channels = await prisma.channel.findFirst({
      where: {
        id: channelId,
      },
    });

    res.json({ data: channels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default channelRouter;
