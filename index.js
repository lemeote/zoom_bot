const axios = require("axios");
const express = require("express");

const clientId = "9VTOyytLShSLxyh4jD5kcQ";
const clientSecret = "YUPU5aHmFnFaXFyMeaj6qgQpN1Gh6Roj";
const redirectUri = "http://localhost:3000/callback";

const meetingId = "87803487933";

const joinMeetingUrl =
  "https://api.zoom.us/v2/meetings/87803487933/registrants";

const startRecordingUrl = `https://api.zoom.us/v2/meetings/87803487933/recording/registrants`;

const app = express();
const server = app.listen(3000, () => {
  console.log("Server listening on port 3000");
});

app.get("/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const tokenResponse = await axios.post(
      "https://zoom.us/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: "https://23db-83-234-227-51.ngrok-free.app/callback",
        },
        auth: {
          username: "TTtGnVM7RAC3BVDfTVuVoQ",
          password: "wD66oeLtWeESQhdMbVIiTEcuJO61Sgy7",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log("Access token:", accessToken);

    await joinMeeting(accessToken);
    await startRecording(accessToken);

    res.send("Bot joined the meeting and started recording successfully.");
  } catch (error) {
    console.error("Error:", error);
    res.send("Failed to join the meeting and start recording.");
  } finally {
    server.close();
  }
});

(async () => {
  const authorizationUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=TTtGnVM7RAC3BVDfTVuVoQ&redirect_uri=${encodeURIComponent(
    "https://23db-83-234-227-51.ngrok-free.app/callback"
  )}`;
  console.log(
    `Please open the following URL in your browser and proceed with the authorization process:\n${authorizationUrl}`
  );
})();

async function joinMeeting(accessToken) {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const response = await axios({
      method: post,
      url: joinMeetingUrl,
      headers: headers
    })
    console.log("red tro...", response.data);
    const joinUrl = response.data.join_url;
    console.log("Bot joined the meeting. Join URL:", joinUrl);
    return joinUrl;
  } catch (error) {
    console.error("Failed to join the meeting.", error.message);
  }
}

async function startRecording(accessToken) {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const body = {
      action: "start",
    };
    await axios.post(startRecordingUrl, body, { headers });
    console.log("Recording started successfully.");
  } catch (error) {
    console.error("Failed to start recording.", error.message);
  }
}
