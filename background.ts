let isCapturing = false;
let intervalId: number | NodeJS.Timeout | null = null;
import { GOOGLE_CLOUD_API_KEY } from "./config.js";

console.log("Background script loaded");

async function analyzeImageWithApiKey(base64Image: string) {
  console.log("Calling Vision API...");
  const apiEndpoint = "https://vision.googleapis.com/v1/images:annotate";

  const requestBody = {
    requests: [
      {
        image: {
          content: base64Image,
        },
        features: [
          {
            type: "SAFE_SEARCH_DETECTION",
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(`${apiEndpoint}?key=${GOOGLE_CLOUD_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Response:", errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      );
    }

    const data = await response.json();
    return data.responses[0].safeSearchAnnotation;
  } catch (error) {
    console.error("Error calling Vision API:", error);
    throw error;
  }
}

async function analyzeScreenshot(dataUrl: string) {
  console.log("Analyzing screenshot...");
  try {
    const base64Image = dataUrl.replace(
      /^data:image\/(png|jpg|jpeg);base64,/,
      ""
    );
    const detections = await analyzeImageWithApiKey(base64Image);

    if (detections) {
      if (
        detections.violence !== "VERY_UNLIKELY" &&
        detections.adult !== "VERY_UNLIKELY" &&
        detections.violence !== "UNKNOWN" &&
        detections.adult !== "UNKNOWN"
      ) {
        let message = "";
        const severity = Math.max(
          ["UNLIKELY", "POSSIBLE", "LIKELY", "VERY_LIKELY"].indexOf(
            detections.violence
          ),
          ["UNLIKELY", "POSSIBLE", "LIKELY", "VERY_LIKELY"].indexOf(
            detections.adult
          )
        );

        switch (severity) {
          case 0:
            message =
              "Cibar has detected some signs that you <b>might be experiencing</b> cyberbullying. Even if it doesn’t feel severe yet, it’s important to take this seriously. Start by documenting any messages or interactions that involve adult or violent content. Consider blocking the person involved and report the content to the platform’s moderators. Stay cautious, and take a break from the platform if you need to.";
            break;
          case 1:
            message =
              "Cibar has identified that cyberbullying is <b>likely happening</b>. You might be receiving unwanted or inappropriate messages. Don’t engage with the person. Instead, block them, report the behavior, and keep records of the interactions. It's a good idea to reach out to someone you trust for support and take control by adjusting your privacy settings.";
            break;
          case 2:
            message =
              "Cibar is telling you that cyberbullying is <b>very likely</b>. You might be dealing with repeated, harmful interactions involving adult or violent content. At this point, it’s crucial to block and report the person immediately. Keep evidence of what's happening and, if the content is especially harmful, consider reaching out to law enforcement. Remember, you don’t have to handle this alone.";
            break;
          case 3:
            message =
              "Cibar has flagged this situation as <b>extremely likely</b> cyberbullying. You may be receiving explicit threats or adult content that’s crossing dangerous lines. It’s vital to stop all contact immediately, block the individual, and report them to the platform and authorities. Take screenshots of everything and get someone you trust involved to help you handle this.";
            break;
        }

        return {
          message,
          detections,
          violence: detections.violence,
          adult: detections.adult,
        };
      } else {
        return {
          message:
            "Cibar has detected <b>little to no chance</b> of cyberbullying in your current interactions. While this is reassuring, it's always a good idea to stay mindful of your online safety. Keep your privacy settings secure, and be cautious about who you interact with. Even if everything seems fine now, it's helpful to stay alert and know that Cibar will notify you if any problematic behavior arises. If you ever feel uncomfortable, you can still take action by documenting interactions and adjusting who you engage with online.",
          detections: detections,
          violence: detections.violence,
          adult: detections.adult,
        };
      }
    } else {
      return "No detections available";
    }
  } catch (error) {
    console.error("Error analyzing screenshot:", error);
    return "Error analyzing image";
  }
}

function startCapturing() {
  console.log("Capturing started", isCapturing);
  if (!isCapturing) {
    isCapturing = true;
    intervalId = setInterval(captureScreen, 10000);
  }
}

function captureScreen() {
  console.log("Screen capture initialized");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab && activeTab.id) {
      chrome.tabs.captureVisibleTab(
        activeTab.windowId,
        { format: "png" },
        async (dataUrl) => {
          if (dataUrl) {
            const analysisResult = await analyzeScreenshot(dataUrl);
            console.log("Analysis result:", analysisResult);

            chrome.runtime.sendMessage({
              action: "analysisResult",
              analysisResult,
            });
          }
        }
      );
    }
  });
}

startCapturing();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getScreenshots") {
    chrome.storage.local.get(null, (items) => {
      sendResponse(items);
    });
    return true;
  }
});
