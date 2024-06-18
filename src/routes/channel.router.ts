import { Request, Response, Router } from "express";

import { getRoomName } from "@/socket";

import prisma from "@lib/prisma";

const channelRouter = Router();

channelRouter.get("/:channelId", async (req: Request, res: Response) => {
  const { channelId } = req.params;

  if (!channelId) {
    return res.status(400).json({ message: "channelId is required" });
  }

  try {
    const channels = await prisma.channel.findFirst(
      {
        where: {
          id: channelId,
        },
      }
    );

    res.json({ data: channels });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default channelRouter;
