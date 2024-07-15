require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Zoom = require("zoomus")({
  key: process.env.ZOOM_API_KEY,
  secret: process.env.ZOOM_API_SECRET,
});

const app = express();
app.use(bodyParser.json());

// Function to validate Zoom webhook requests
function validateZoomWebhook(request) {
  const message = `v0:${
    request.headers["x-zm-request-timestamp"]
  }:${JSON.stringify(request.body)}`;
  const hashForVerify = crypto
    .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET)
    .update(message)
    .digest("hex");
  const signature = `v0=${hashForVerify}`;
  return request.headers["x-zm-signature"] === signature;
}

// Function to download and save recording files
async function downloadRecording(meetingId, downloadUrl, fileName) {
  const response = await axios.get(downloadUrl, {
    responseType: "stream",
    headers: {
      Authorization: `Bearer ${process.env.ZOOM_JWT_TOKEN}`,
    },
  });

  const filePath = path.join(
    __dirname,
    "recordings",
    `${meetingId}-${fileName}`
  );
  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

// Route to handle Zoom webhooks
app.post("/webhook", async (req, res) => {
  if (!validateZoomWebhook(req)) {
    console.log("Invalid signature");
    return res.status(400).send("Invalid signature");
  }

  const { event, payload } = req.body;

  console.log("Webhook received:", event);

  if (event === "meeting.started") {
    const meetingId = payload.object.id;
    const userId = payload.operator_id;

    try {
      const response = await Zoom.meeting.record({
        id: meetingId,
        userId: userId,
        start: true,
      });
      console.log("Recording started:", response);
    } catch (error) {
      console.error("Error starting recording:", error.message);
    }
  } else if (event === "meeting.ended") {
    const meetingId = payload.object.id;
    const userId = payload.operator_id;

    try {
      const response = await Zoom.meeting.record({
        id: meetingId,
        userId: userId,
        start: false,
      });
      console.log("Recording stopped:", response);

      // Fetch recording files
      const recordingsResponse = await axios.get(
        `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
        {
          headers: {
            Authorization: `Bearer ${process.env.ZOOM_JWT_TOKEN}`,
          },
        }
      );

      // Save each recording file
      for (const file of recordingsResponse.data.recording_files) {
        if (file.file_extension === "MP4" || file.file_extension === "M4A") {
          await downloadRecording(
            meetingId,
            file.download_url,
            file.id + "." + file.file_extension
          );
          console.log(`Recording saved: ${file.id}.${file.file_extension}`);
        }
      }
    } catch (error) {
      console.error("Error stopping recording:", error.message);
    }
  }

  res.status(200).send();
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
