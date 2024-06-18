import { createClient, type RedisClientType } from "redis";
import { REDIS_HOST, REDIS_PORT } from "@utils/env";

class Redis {
  host: string;
  port: string;
  connected: boolean;
  client: RedisClientType;

  constructor() {
    this.host = REDIS_HOST;
    this.port = REDIS_PORT;
    this.connected = false;
    this.client = null;
  }

  getConnection() {
    if (this.connected) return this.client;
    else {
      this.client = createClient({
        url: `redis://${this.host}:${this.port}`
      });

      this.client.on('error', (err) => {
        console.error('Redis connection error:', err);
        this.connected = false;
        this.client = null;
      });

      try {
        this.client.connect();
        this.connected = true;
        return this.client;
      } catch (err) {
        console.error('Error connecting to Redis', err);
        this.connected = false;
        this.client = null;
        throw err;
      }
    }
  }
}

export default new Redis();
