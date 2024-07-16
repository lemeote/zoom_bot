const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
// const ngrok = require("ngrok");
const querystring = require("querystring");
require("dotenv").config();

const app = express();
const port = 3000;

const clientId = process.env.ZOOM_CLIENT_ID;
const clientSecret = process.env.ZOOM_CLIENT_SECRET;
let accessToken = "";

app.use(bodyParser.json());

async function getAccessToken(code) {
  const tokenUrl = "https://zoom.us/oauth/token";
  const params = querystring.stringify({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: process.env.ZOOM_REDIRECT_URI,
  });

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await axios.post(tokenUrl, params, {
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data.access_token;
}

app.get("/oauth", async (req, res) => {
  const code = req.query.code;
  if (code) {
    accessToken = await getAccessToken(code);
    res.send("OAuth authentication successful! You can now close this window.");
  } else {
    res.send("OAuth authentication failed!");
  }
});

app.post("/webhook", async (req, res) => {
  const event = req.body.event;
  const meetingId = req.body.payload.object.id;

  console.log(`Received event: ${event} for meeting: ${meetingId}`);

  if (!accessToken) {
    res.status(401).send("Access token not available");
    return;
  }

  if (event === "meeting.started") {
    try {
      const response = await axios.post(
        `https://api.zoom.us/v2/meetings/${meetingId}/recordings/start`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Recording started:", response.data);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  } else if (event === "meeting.ended") {
    try {
      const response = await axios.post(
        `https://api.zoom.us/v2/meetings/${meetingId}/recordings/stop`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Recording stopped:", response.data);
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  }

  res.status(200).send("Event received");
});

app.listen(port, async () => {
  console.log(`Zoom webhook listener running at http://localhost:${port}`);

  // const url = await ngrok.connect(port);
  // console.log(`ngrok tunnel opened at: ${url}`);
  // console.log("Webhook URL:", `${url}/webhook`);
  // console.log("OAuth Redirect URL:", `${url}/oauth`);
});
