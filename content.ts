// src/content.ts

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "changeColor") {
    document.body.style.backgroundColor = request.color;
  }
});
