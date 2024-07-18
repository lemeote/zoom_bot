const axios = require("axios");
const querystring = require("querystring");

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

module.exports = async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResponse = await axios.post(
      "https://zoom.us/oauth/token",
      querystring.stringify({
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
};
