import express from "express";
import { json, urlencoded } from "body-parser";
import { post, patch } from "axios";
import { launch } from "puppeteer";
import { stringify } from "querystring";
import { createHmac } from "crypto";
const app = express();
require("dotenv").config();

app.use(json());
app.use(urlencoded({ extended: true }));

const clientId = "14R6A1yuTdnlhqYvb6G0w";
const clientSecret = "UuOMuUCf4ohP7Z6MnxRYJjaW0hFzss7b";
const redirectUri = "https://23db-83-234-227-51.ngrok-free.app/callback";

let accessToken = null;

function generateSignature(apiKey, apiSecret, meetingNumber, role) {
  const timestamp = new Date().getTime() - 30000;
  const msg = Buffer.from(apiKey + meetingNumber + timestamp + role).toString(
    "base64"
  );
  const hash = createHmac("sha256", apiSecret)
    .update(msg)
    .digest("base64");
  const signature = Buffer.from(
    `${apiKey}.${meetingNumber}.${timestamp}.${role}.${hash}`
  ).toString("base64");
  return signature;
}

app.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResponse = await post(
      "https://zoom.us/oauth/token",
      stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${clientId}:${clientSecret}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = tokenResponse.data.access_token;
    res.json({ message: "Authentication successful" });
  } catch (error) {
    console.error(
      "Failed to exchange authorization code for access token:",
      error
    );
    res.status(500).send("Failed to authenticate");
  }
});

app.post("/webhook", async (req, res) => {
  const event = req.body.event;
  const meetingId = req.body.payload.object.id;

  if(req.body.event === 'endpoint.url_validation') {
      const hashForValidate = createHmac("sha256", "hzQH0YrJQGGyWqEZMNHu5Q")
        .update(req.body.payload.plainToken)
        .digest("hex");

      response = {
        message: {
          plainToken: req.body.payload.plainToken,
          encryptedToken: hashForValidate
        },
        status: 200
      }

      console.log(response.message)

      res.status(response.status)
      res.json(response.message)
    } else {
      response = { message: 'Authorized request to Zoom Webhook sample.', status: 200 }

      console.log(response.message)

      res.status(response.status)
      res.json(response)
    }

  if (event === "meeting.started") {
    try {
      const signature = generateSignature(clientId, clientSecret, meetingId, 0);

      const joinUrl = `https://zoom.us/wc/join/87803487933?tk=${signature}`;

      console.log("Join URL:", joinUrl);

      post("http://localhost:3001/join-meeting", { joinUrl })
        .then((response) => {
          console.log("Bot join URL sent successfully:", response.data);
        })
        .catch((error) => {
          console.error("Failed to send bot join URL:", error);
        });
    } catch (error) {
      console.error("Failed to process meeting start event:", error);
    }

    try {
      const response = await post(
        "https://api.zoom.us/v2/users/me/meetings",
        {
          topic: "Meeting with Recording",
          type: 1,
          settings: {
            auto_recording: "cloud",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Meeting created successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }

  if (event === "meeting.ended") {
    try {
      const stopRecordingResponse = await patch(
        `https://api.zoom.us/v2/meetings/${meetingId}/recordings/status`,
        {
          action: "stop",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "Recording stopped successfully:",
        stopRecordingResponse.data
      );
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  }

  res.status(200).send("Event received");
});

const port = 3000;
app.listen(port, () => {
  console.log(`OAuth and webhook server running on port ${port}`);
});

const botApp = express();
botApp.use(json());

botApp.post("/join-meeting", async (req, res) => {
  const { joinUrl } = req.body;

  try {
    const browser = await launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(joinUrl, { waitUntil: "networkidle2" });

    // Handle joining steps
    await page.waitForSelector("#wc_agree1", { visible: true, timeout: 30000 });
    await page.click("#wc_agree1");

    // Add more steps as needed to fully join the meeting

    console.log("Bot joined the meeting successfully.");
    res.status(200).send("Bot joined the meeting successfully.");
  } catch (error) {
    console.error("Failed to join the meeting:", error);
    res.status(500).send("Failed to join the meeting.");
  }
});

const botPort = 3001;
botApp.listen(botPort, () => {
  console.log(`Puppeteer server running on port ${botPort}`);
});
