require("dotenv").config();

const clientId = process.env.CLIENT_ID;
const redirectUri = process.env.REDIRECT_URI;

module.exports = (req, res) => {
  const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
  res.redirect(authUrl);
};
