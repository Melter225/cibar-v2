const CAPTURE_INTERVAL = 10000;
const RESULT_DISPLAY_DURATION = 3000;

let lastUpdateTime = 0;

console.log("Popup script loaded");

function updateAnalysisResult(result: string) {
  console.log(result);
  const statusElement = document.getElementById("status");
  const resultElement = document.getElementById("analysisResult");

  if (statusElement && resultElement) {
    resultElement.innerHTML =
      result.slice(0, result.indexOf(".") + 1) +
      "\n\n" +
      result.slice(result.indexOf(".") + 1);
    result.split("<b>").join(".\n");

    resultElement.style.display = "block";
    statusElement.style.display = "none";

    lastUpdateTime = Date.now();

    setTimeout(() => {
      statusElement.style.display = "block";
    }, RESULT_DISPLAY_DURATION);
  }
}

function checkAnalysisStatus() {
  const statusElement = document.getElementById("status");
  const resultElement = document.getElementById("analysisResult");

  if (statusElement && resultElement) {
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - lastUpdateTime;

    if (timeSinceLastUpdate >= CAPTURE_INTERVAL) {
      statusElement.style.display = "block";
    }
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "analysisResult") {
    updateAnalysisResult(message.analysisResult.message);
  }
});

setInterval(checkAnalysisStatus, 1000);
checkAnalysisStatus();
