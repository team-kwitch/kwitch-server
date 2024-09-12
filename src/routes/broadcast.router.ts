import { getWorker } from "@/lib/mediasoup";
import { Request, Response, Router } from "express";
import Container from "typedi";

const broadcastRouter = Router();

broadcastRouter.post("/", async (req: Request, res: Response) => {
    const { channelId, title } = req.body;

    if (!channelId || !title) {
        return res.status(400).json({ message: "channelId and title are required" });
    }

    const broadcastService = Container.get(BroadcastService);
    const { broadcast, router } = await broadcastService.createBroadcast(channelId, title);
})