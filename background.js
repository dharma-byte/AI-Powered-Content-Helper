const MENU_IDS = {
  SUMMARIZE: "summarize_selection",
  DRAFT_EMAIL: "draft_email_reply",
  IMPROVE_LINKEDIN: "improve_linkedin_post"
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_IDS.SUMMARIZE,
    title: "Summarize with AI",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: MENU_IDS.DRAFT_EMAIL,
    title: "Draft email reply (AI)",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: MENU_IDS.IMPROVE_LINKEDIN,
    title: "Polish LinkedIn post (AI)",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !info.selectionText) return;

  const apiKey = await getApiKey();
  if (!apiKey) {
    await sendToTab(tab.id, {
      type: "SHOW_RESULT",
      title: "API key missing",
      content: "Open Options and add your OpenAI API key."
    });
    return;
  }

  let system = "You are a concise, professional writing assistant. Use clear, helpful language and markdown when useful.";
  let userPrompt = "";

  switch (info.menuItemId) {
    case MENU_IDS.SUMMARIZE:
      userPrompt = `Summarize the following text into 3–6 bullet points, keeping key facts and tone neutral:\n\n${info.selectionText}`;
      break;
    case MENU_IDS.DRAFT_EMAIL:
      userPrompt = `You are replying to the following email. Write a polite, professional reply in 120–180 words, with a clear subject suggestion and bullet action items when relevant.\n\nEMAIL:\n${info.selectionText}`;
      break;
    case MENU_IDS.IMPROVE_LINKEDIN:
      userPrompt = `Rewrite the following LinkedIn post to be scannable, engaging, and under 120 words. Use a strong hook, 2–4 short lines, and a single CTA. Keep emojis minimal and relevant.\n\nPOST:\n${info.selectionText}`;
      break;
    default:
      return;
  }

  try {
    const content = await callOpenAI(apiKey, system, userPrompt);
    await sendToTab(tab.id, { type: "SHOW_RESULT", title: "AI Result", content });
  } catch (e) {
    await sendToTab(tab.id, {
      type: "SHOW_RESULT",
      title: "Error",
      content: `Request failed: ${e?.message || e}`
    });
  }
});

async function getApiKey() {
  const res = await chrome.storage.local.get(["OPENAI_API_KEY", "OPENAI_MODEL"]);
  return res.OPENAI_API_KEY || null;
}

async function callOpenAI(apiKey, system, user) {
  const model = (await chrome.storage.local.get("OPENAI_MODEL")).OPENAI_MODEL || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${txt}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "(No content)";
}

async function sendToTab(tabId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, payload);
  } catch {
    // content script may not be ready; try injecting it
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    await chrome.tabs.sendMessage(tabId, payload);
  }
}
