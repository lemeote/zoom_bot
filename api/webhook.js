const crypto = require("crypto");
const axios = require("axios");

let accessToken = null; // Move this to a shared module if needed

function generateSignature(apiKey, apiSecret, meetingNumber, role) {
  const timestamp = new Date().getTime() - 30000;
  const msg = Buffer.from(apiKey + meetingNumber + timestamp + role).toString(
    "base64"
  );
  const hash = crypto
    .createHmac("sha256", apiSecret)
    .update(msg)
    .digest("base64");
  const signature = Buffer.from(
    `${apiKey}.${meetingNumber}.${timestamp}.${role}.${hash}`
  ).toString("base64");
  console.log("this is the signature", signature);
  return signature;
}

module.exports = async (req, res) => {
  const event = req.body.event;
  const meetingId = req.body.payload.object.id;

  if (req.body.event === "endpoint.url_validation") {
    const hashForValidate = crypto
      .createHmac("sha256", "hzQH0YrJQGGyWqEZMNHu5Q")
      .update(req.body.payload.plainToken)
      .digest("hex");

    const response = {
      message: {
        plainToken: req.body.payload.plainToken,
        encryptedToken: hashForValidate,
      },
      status: 200,
    };

    console.log(response.message);

    res.status(response.status).json(response.message);
    return;
  }

  if (event === "meeting.started") {
    try {
      const signature = generateSignature(clientId, clientSecret, meetingId, 0);

      const joinUrl = `https://zoom.us/wc/join/${meetingId}?tk=${accessToken}`;
      console.log("Join URL:", joinUrl);

      axios
        .post("https://your-vercel-domain/api/join-meeting", { joinUrl })
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
      const response = await axios.post(
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
      const stopRecordingResponse = await axios.patch(
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
};
