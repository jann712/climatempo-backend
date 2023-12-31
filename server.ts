import express from "express";
import axios from "axios";
import { createClient } from "redis";
import cors from "cors";
import "dotenv/config";

const redisURL = process.env.REDIS_URL;
const redisClient = createClient({ url: redisURL }).on('error', err => console.log('Redis Client Error', err))
const app = express();
const port = 3000;
const DEFAULT_EXPIRATION = 3600;
const token = process.env.API_TOKEN;

type Clima = {
  country: string;
  date: string;
  text: string;
};

app.use(cors());


app.get("/clima", async (req, res) => {
  
  const execStart = performance.now();

  const clima = await redisClient.get("clima").then(async (response) => {
    if (response == null) {
      const { data } = await axios.get(
        `http://apiadvisor.climatempo.com.br/api/v1/anl/synoptic/locale/BR?token=${token}`
      );
      await redisClient.setEx("clima", 60, JSON.stringify(data));
      data[0]["execTime"] = performance.now() - execStart;
      data[0]["cached"] = false
      console.log("clima is null");
      res.status(201).json(data);
    } else if (response != null) {
      console.log("clima is cached");
      const jsonData = JSON.parse(response);
      jsonData[0]["execTime"] = performance.now() - execStart;
      jsonData[0]["cached"] = true

      res.status(201).json(jsonData);
    }

    res.status(404).send();
  });
});
app.listen(port, async () => {
  { !(redisClient.isReady) ? await redisClient.connect() : console.log("Redis connection already open.")}
  console.log(`Server started at port ${port}`);
});
