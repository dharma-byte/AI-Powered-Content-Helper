document.getElementById("openOptions").onclick = () => chrome.runtime.openOptionsPage();

document.getElementById("run").onclick = async () => {
  const text = document.getElementById("input").value.trim();
  const mode = document.getElementById("mode").value;
  const status = document.getElementById("status");
  if (!text) {
    status.textContent = "Please paste some text.";
    return;
  }

  const apiKey = (await chrome.storage.local.get("OPENAI_API_KEY")).OPENAI_API_KEY;
  if (!apiKey) {
    status.textContent = "Add your OpenAI API key in Options.";
    return;
  }

  let system = "You are a concise, professional writing assistant. Use clear, helpful language and markdown when useful.";
  let userPrompt;
  if (mode === "summarize") {
    userPrompt = `Summarize the following text into 3–6 bullet points:\n\n${text}`;
  } else if (mode === "email") {
    userPrompt = `You are replying to the following email. Write a polite, professional reply in 120–180 words, with a clear subject suggestion and bullet action items when relevant.\n\nEMAIL:\n${text}`;
  } else {
    userPrompt = `Rewrite the following LinkedIn post to be scannable, engaging, and under 120 words. Use a strong hook, 2–4 short lines, and a single CTA. Keep emojis minimal and relevant.\n\nPOST:\n${text}`;
  }

  status.textContent = "Working…";
  try {
    const out = await callOpenAI(apiKey, system, userPrompt);
    status.textContent = "Done! Opening on page.";
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { type: "SHOW_RESULT", title: "AI Result", content: out });
  } catch (e) {
    status.textContent = `Error: ${e?.message || e}`;
  }
};

async function callOpenAI(apiKey, system, user) {
  const model = (await chrome.storage.local.get("OPENAI_MODEL")).OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
  if (!res.ok) throw new Error(`OpenAI error (${res.status})`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "(No content)";
}
