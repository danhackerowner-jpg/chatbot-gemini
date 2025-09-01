let messages = [];

// DOM elements
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Load chat history from localStorage
function loadHistory() {
  const saved = localStorage.getItem("gemini.flash.history");
  if (saved) {
    messages = JSON.parse(saved);
    messages.forEach(msg => addMessage(msg.text, msg.sender, false));
  }
}

// Save chat history to localStorage
function saveHistory() {
  localStorage.setItem("gemini.flash.history", JSON.stringify(messages));
}

// Add a message to the chat UI
function addMessage(text, sender, save = true) {
  const msgEl = document.createElement("div");
  msgEl.className = `message ${sender}`;
  msgEl.innerText = text;
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (save) {
    messages.push({ text, sender });
    saveHistory();
  }
}

// Add animated typing effect for bot messages
async function addStreamingMessage(stream, save = true) {
  const msgEl = document.createElement("div");
  msgEl.className = `message bot`;
  chatBox.appendChild(msgEl);

  let buffer = "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Streamed data split by "data: " lines
    const parts = buffer.split("\n\n");
    buffer = parts.pop(); // keep last unfinished chunk

    for (const part of parts) {
      if (part.startsWith("data: ")) {
        const payload = JSON.parse(part.slice(6));
        if (payload.delta) {
          msgEl.innerText += payload.delta;
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      }
    }
  }

  // Save final message
  if (save) {
    messages.push({ text: msgEl.innerText, sender: "bot" });
    saveHistory();
  }
}

// Send user input to server
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });

    if (!response.body) {
      throw new Error("No response body");
    }

    await addStreamingMessage(response.body);
  } catch (err) {
    console.error(err);
    addMessage("⚠️ Error: " + err.message, "bot");
  }
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Load chat history when app starts
loadHistory();
                                       
