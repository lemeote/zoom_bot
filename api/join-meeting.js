const puppeteer = require("puppeteer");
require("dotenv").config();

module.exports = async (req, res) => {
  const { joinUrl } = req.body;

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--disable-setuid-sandbox"],
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: 1920,
      height: 1080,
    });
    await page.goto(joinUrl, { waitUntil: "networkidle2" });

    await page.waitForSelector("#wc_agree1", { visible: true, timeout: 30000 });
    await page.click("#wc_agree1");

    console.log("Bot joined the meeting successfully.");
    res.status(200).send("Bot joined the meeting successfully.");
  } catch (error) {
    console.error("Failed to join the meeting:", error);
    res.status(500).send("Failed to join the meeting.");
  }
};
