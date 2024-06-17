import { createClient, type RedisClientType } from "redis";

class Redis {
  host: string;
  port: string;
  connected: boolean;
  client: RedisClientType;

  constructor() {
    this.host = process.env.REDIS_HOST || "localhost";
    this.port = process.env.REDIS_PORT || "6379";
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
