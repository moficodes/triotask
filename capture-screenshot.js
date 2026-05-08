import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  
  const url = 'https://triotask-598464211339.us-west2.run.app';
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // Add some dummy tasks for the screenshot
  await page.fill('input[placeholder*="What\'s the mission?"]', 'Finish the hackathon project');
  await page.click('button:has(svg.lucide-plus)'); // Click the add button
  
  await page.fill('input[placeholder*="What\'s the mission?"]', 'Present TrioTask to judges');
  await page.click('button:has(svg.lucide-plus)');

  await page.fill('input[placeholder*="What\'s the mission?"]', 'Celebrate success!');
  await page.click('button:has(svg.lucide-plus)');

  // Take the screenshot
  await page.screenshot({ path: 'triotask/screenshots/demo.png' });
  console.log('Screenshot saved to triotask/screenshots/demo.png');

  await browser.close();
})();
