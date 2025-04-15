import type { NextApiRequest, NextApiResponse } from 'next';
import getRawBody from 'raw-body';
import { parse } from 'querystring';
import puppeteer from 'puppeteer';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js default body parsing
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawBody = await getRawBody(req);
  const parsedBody = parse(rawBody.toString()); // Converts to an object

  const Body = parsedBody.Body as string;
  const From = parsedBody.From as string;

  console.log("📩 Incoming message body:", Body);
  console.log("📞 From:", From);

  const urlMatch = Body?.match(/https?:\/\/\S+/);
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
  page.on('request', (request) => {
    if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });

  try {
    console.log("🌐 Navigating to the page...");
    await page.goto(url, { waitUntil: 'load' });

    const claimedMessage = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a'));
      return elements.map(el => el.outerHTML);
    });

    console.log("🔍 Found elements with buttons/links:", claimedMessage);

    if (claimedMessage) {
      console.log("⚠️ Opportunity has already been claimed.");
      await browser.close();
      return res.status(200).json({ message: 'Opportunity already claimed.' });
    }

    console.log("⏱️ Searching for the Claim Opportunity button...");
    const buttonFound = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent?.includes('Claim Opportunity'));
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

  } catch (err: any) {
    console.log("💥 Error occurred:", err.message);
    await browser.close();
    return res.status(500).json({ error: 'Something went wrong.', details: err.message });
  }
}
