// claimController.js
import puppeteer from 'puppeteer';

export const claimOpportunity = async (req, res) => {
  const { Body } = req.body;
  console.log("🔍 Method:", req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log("📩 Incoming message body:", Body);

  const urlMatch = Body.match(/https?:\/\/\S+/);
  const url = urlMatch ? urlMatch[0] : null;

  if (!url) {
    console.log("❌ No URL found in the message.");
    return res.status(400).json({ error: 'No URL found in message body' });
  }

  console.log("🔗 Extracted URL:", url);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    console.log("🌐 Navigating to the page...");
    await page.goto(url, { waitUntil: 'load' });

    const claimedMessage = await page.evaluate(() => {
      return document.body.innerText.includes('Opportunity Claimed!');
    });

    if (claimedMessage) {
      console.log("⚠️ Opportunity has already been claimed.");
      await browser.close();
      return res.status(200).json({ message: 'Opportunity already claimed.' });
    }

    console.log("⏱️ Searching for the Claim Opportunity button...");
    const buttonFound = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.includes('Claim Opportunity'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    await browser.close();

    if (buttonFound) {
      console.log("🚀 Button clicked.");
      return res.status(200).json({ message: 'Claim Opportunity button clicked!' });
    } else {
      console.log("⚠️ Button not found.");
      return res.status(200).json({ message: 'Button not found — maybe opportunity already claimed.' });
    }

  } catch (err) {
    console.log("💥 Error occurred:", err.message);
    await browser.close();
    return res.status(500).json({ error: 'Something went wrong.', details: err.message });
  }
};