import puppeteer from "puppeteer";

import { logger } from "./logger.js";
import { makeRewardData } from "./utils.js";

/**
 *
 * @param {string} userUniqueID
 * @returns {string[]}
 *
 */
export const collectRewards = async (userUniqueID) => {
  const pageUrl = "https://8ballpool.com/en/shop";
  const delay = 100;
  const BROWSER_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];
  const TIMEOUT = 15000;

  logger("debug", "🚀 Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    slowMo: delay,
    args: BROWSER_ARGS,
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36"
  );

  logger("info", `🌐 Navigating to ${pageUrl}`);
  await page.goto(pageUrl, { waitUntil: "networkidle2" });
  logger("debug", `✅ Navigation complete, waiting for login button.`);

  const LOGIN_SELECTOR = 'xpath//html/body/div[1]/div/div[1]/div/div[2]/header/div[3]/div/button[1]';
  logger("debug", `⏳ Waiting for selector: ${LOGIN_SELECTOR} (Timeout: ${TIMEOUT}ms)`);
  
  const loginButton = await page.waitForSelector(
    LOGIN_SELECTOR,
    { visible: true, timeout: TIMEOUT }
  );

  if (loginButton) {
    logger("debug", "🔍 Login button found, clicking.");
    await loginButton.click();
    
    // Campo de Input
    const INPUT_ID_SELECTOR = 'xpath//html/body/div[1]/div/div[2]/div/div[2]/div/div/div/div/form/div[2]/div[1]/input';
    logger("debug", `⏳ Waiting for input selector: ${INPUT_ID_SELECTOR} (Timeout: ${TIMEOUT}ms)`);
    
    await page.waitForSelector(INPUT_ID_SELECTOR, { visible: true, timeout: TIMEOUT });
    
    await page.type(INPUT_ID_SELECTOR, userUniqueID, {
      delay,
    });
    
    // ATUALIZADO: Usando o novo XPath absoluto para o botão "Go"
    const GO_SELECTOR = 'xpath//html/body/div[1]/div/div[2]/div/div[2]/div/div/div/div/form/div[2]/div[2]/button';
    logger("debug", `⏳ Waiting for selector: ${GO_SELECTOR}`);
    
    const goButton = await page.waitForSelector(
      GO_SELECTOR,
      { visible: true, timeout: TIMEOUT }
    );
    await goButton.click();
    logger("success", "✅ User logged in.");
  } else {
    logger("error", "❌ Login button not found.");
    throw new Error("Unable to login.");
  }

  let rewards = [];
  const PRODUCTS_SELECTOR = ".product-list-item";
  logger("debug", `🔍 Searching for products with selector: ${PRODUCTS_SELECTOR}`);
  const products = await page.$$(PRODUCTS_SELECTOR);
  const N = products.length;

  logger("info", `💡 ${N} products found.`);

  for (const [index, product] of products.entries()) {
    logger("debug", `➡️ Processing product [${index + 1}/${N}]`);
    
    const priceButton = await product.$("button");
    const price = await priceButton.evaluate((el) =>
      el.textContent.trim().toUpperCase()
    );

    const imageElement = await product.$("img");
    const imageSrc = await imageElement.evaluate((i) => i.getAttribute("src"));

    const nameElement = await product.$("h3");
    const name = await nameElement.evaluate((el) => el.textContent.trim());

    const quantityElement = await product.$(".amount-text");

    let quantity = "";
    if (quantityElement) {
      quantity = await quantityElement.evaluate((el) => el.textContent.trim());
    }

    logger("info", `🚲 [${index + 1}/${N}] ${price} ${name}`);

    if (price.toUpperCase() === "FREE" || price.toUpperCase() === "CLAIMED") {
      logger("info", `⏳ Claiming: [${index + 1}/${N}]`);
      await priceButton.click();
      rewards.push(makeRewardData(imageSrc, name, quantity));
      logger("success", `🎉 Claimed: [${index + 1}/${N}]`);
    } else {
      logger("debug", `💰 Product [${index + 1}/${N}] skipped. Price: ${price}`);
    }
  }

  await browser.close();
  logger("info", "❎ Browser closed.");

  if (rewards.length === 0) {
    logger("warn", "⚠️ No free rewards found.");
    throw new Error("No rewards found");
  }

  return rewards;
};
