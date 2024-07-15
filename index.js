require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const ZOOM_API_URL = "https://api.zoom.us/v2";
const ACCESS_TOKEN = process.env.ZOOM_ACCESS_TOKEN;

app.post("/webhook", async (req, res) => {
  const { event, payload } = req.body;

  if (event === "meeting.started") {
    const meetingId = payload.object.id;
    await startRecording(meetingId);
  } else if (event === "meeting.ended") {
    const meetingId = payload.object.id;
    await stopRecording(meetingId);
  }

  res.status(200).send("Webhook received");
});

const startRecording = async (meetingId) => {
  try {
    const response = await axios.post(
      `${ZOOM_API_URL}/meetings/${meetingId}/recordings/start`,
      {},
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );
    console.log("Recording started:", response.data);
  } catch (error) {
    console.error("Error starting recording:", error.response.data);
  }
};

const stopRecording = async (meetingId) => {
  try {
    const response = await axios.post(
      `${ZOOM_API_URL}/meetings/${meetingId}/recordings/stop`,
      {},
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      }
    );
    console.log("Recording stopped:", response.data);
  } catch (error) {
    console.error("Error stopping recording:", error.response.data);
  }
};

app.listen(port, () => {
  console.log(`Zoom bot is listening at http://localhost:${port}`);
});
