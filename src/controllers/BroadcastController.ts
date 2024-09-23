import { Response } from "express";
import { Controller, Get, Res } from "routing-controllers";
import { Service } from "typedi";

import { BroadcastService } from "@/services/BroadcastService";

@Service()
@Controller("/broadcasts")
export class BroadcastController {
  private readonly broadcastService: BroadcastService;

  constructor(broadcastService: BroadcastService) {
    this.broadcastService = broadcastService;
  }

  @Get("/")
  public getBroadcasts(@Res() res: Response) {
    const broadcasts = this.broadcastService.getBroadcasts();
    return res.json({
      success: true,
      content: { broadcasts },
    });
  }
}
