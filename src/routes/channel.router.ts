import { Request, Response, Router } from "express";

import Container from "typedi";
import { ChannelService } from "@/services/channel.service";

const channelRouter = Router();
const channelService = Container.get(ChannelService);

channelRouter.get("/live", async (req: Request, res: Response) => {
  const { cursorStr } = req.query;
  let cursor = parseInt(cursorStr as string, 10);

  if (isNaN(cursor) || cursor < 0) {
    cursor = 0;
  }

  const channels = await channelService.getLiveChannels(cursor);
  res.json({ data: channels });
});

channelRouter.get("/:channelId", async (req: Request, res: Response) => {
  const { channelId } = req.params;

  if (!channelId) {
    return res.status(400).json({ message: "channelId is required" });
  }

  const channel = await channelService.getChannelById(channelId);
  res.json({ data: channel });
});

export default channelRouter;
