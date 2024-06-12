import { Request, Response, Router } from "express";

import prisma from "@lib/prisma";

const channelRouter = Router();

channelRouter.get("/", async (req: Request, res: Response) => {
  try {
    const channels = await prisma.channel.findMany();

    res.json(
      channels.map((channel) => {
        channel["broadcaster"] = channel.broadcasterUsername;
        return channel;
      }),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default channelRouter;
