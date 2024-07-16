const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require("querystring");

const app = express();
app.use(bodyParser.json());

const port = 3000;

// Your Zoom OAuth credentials
const CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const REDIRECT_URI = process.env.ZOOM_REDIRECT_URI;

// Global variables to store access token and refresh token
let accessToken = "";
let refreshToken = "";

// Endpoint to start OAuth flow
app.get("/authorize", (req, res) => {
  const authorizeUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authorizeUrl);
});

// OAuth callback endpoint
app.get("/oauth", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResponse = await axios.post(
      "https://zoom.us/oauth/token",
      qs.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = tokenResponse.data.access_token;
    refreshToken = tokenResponse.data.refresh_token;

    res.send("OAuth flow completed. You can now use the bot.");
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("OAuth callback error");
  }
});

// Endpoint to handle webhook events
app.post("/webhook", async (req, res) => {
  const event = req.body.event;
  const meetingId = req.body.payload.object.id;

  if (event === "meeting.started") {
    try {
      await joinMeeting(meetingId);
      res.status(200).send("Bot joined and recording started");
    } catch (error) {
      console.error("Error joining meeting:", error);
      res.status(500).send("Error joining meeting");
    }
  } else {
    res.status(200).send("Event received");
  }
});

// Function to join the Zoom meeting
const joinMeeting = async (meetingId) => {
  const meetingDetails = await axios.get(
    `https://api.zoom.us/v2/meetings/${meetingId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const meetingPassword = meetingDetails.data.password;

  // Logic to join the meeting using Zoom Web SDK or any other method

  // After joining the meeting, start recording
  await startRecording(meetingId);
};

// Function to start recording
const startRecording = async (meetingId) => {
  const zoomAPIUrl = `https://api.zoom.us/v2/meetings/${meetingId}/recordings`;

  try {
    const response = await axios.post(
      zoomAPIUrl,
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
};

// Refresh token function
const refreshTokenFunction = async () => {
  try {
    const tokenResponse = await axios.post(
      "https://zoom.us/oauth/token",
      qs.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = tokenResponse.data.access_token;
    refreshToken = tokenResponse.data.refresh_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
};

// Periodically refresh the access token
setInterval(refreshTokenFunction, 60 * 60 * 1000); // Refresh every hour

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
