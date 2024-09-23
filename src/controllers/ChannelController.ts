import { Response } from "express";
import { Controller, Get, OnUndefined, Param, Res } from "routing-controllers";
import { Service } from "typedi";

import { ChannelService } from "@/services/ChannelService";

@Service()
@Controller("/channels")
export class ChannelController {
  private readonly channelService: ChannelService;

  constructor(channelService: ChannelService) {
    this.channelService = channelService;
  }

  @Get("/:channelId")
  @OnUndefined(404)
  public async getChannel(
    @Res() res: Response,
    @Param("channelId") channelId: string,
  ) {
    const channel = this.channelService.getChannelById(channelId);
    return res.json({
      success: true,
      content: { channel },
    });
  }
}
