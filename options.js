(async function () {
  const saved = await chrome.storage.local.get(["OPENAI_API_KEY", "OPENAI_MODEL"]);
  if (saved.OPENAI_API_KEY) document.getElementById("apiKey").value = saved.OPENAI_API_KEY;
  if (saved.OPENAI_MODEL) document.getElementById("model").value = saved.OPENAI_MODEL;

  document.getElementById("save").onclick = async () => {
    const apiKey = document.getElementById("apiKey").value.trim();
    const model = document.getElementById("model").value;
    await chrome.storage.local.set({ OPENAI_API_KEY: apiKey, OPENAI_MODEL: model });
    document.getElementById("status").textContent = "Saved!";
    setTimeout(() => (document.getElementById("status").textContent = ""), 1200);
  };
})();
