const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const formEl = document.getElementById("composer");
const clearBtn = document.getElementById("clear");
const modelSelect = document.getElementById("model");

const store = {
  key: "gemini.flash.history",
  load(){ try { return JSON.parse(localStorage.getItem(this.key)) ?? []; } catch { return []; } },
  save(h){ localStorage.setItem(this.key, JSON.stringify(h)); },
  clear(){ localStorage.removeItem(this.key); }
};

let history = store.load();
let systemPrompt = "You are a fast, helpful chat assistant. Answer briefly but clearly. Use Markdown when useful.";

function el(html){
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function addMessage(role, content, typing=false){
  const letter = role === "user" ? "U" : "G";
  const msg = el(`<div class="msg">
    <div class="avatar ${role}">${letter}</div>
    <div class="bubble ${typing? 'typing' : ''}"></div>
  </div>`);
  msg.querySelector(".bubble").textContent = content || "";
  chatEl.appendChild(msg);
  chatEl.scrollTop = chatEl.scrollHeight;
  return msg;
}

function updateTypingBubble(msgEl, delta){
  const bubble = msgEl.querySelector(".bubble");
  bubble.textContent += delta;
  chatEl.scrollTop = chatEl.scrollHeight;
}

function resizeInput(){
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 180) + "px";
}

function historyForServer(){
  return history.map(m => ({ role: m.role, content: m.content }));
}

async function sendToServerStream(messages){
  const body = JSON.stringify({ messages, system: systemPrompt });
  const model = modelSelect.value;
  const resp = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Model": model },
    body
  });
  if (!resp.ok) throw new Error("Network error");
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();

  let buf = "";
  while (true){
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1){
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      if (!chunk.startsWith("data:")) continue;
      const payload = JSON.parse(chunk.slice(5).trim());
      if (payload.delta) {
        yield(payload.delta);
      } else if (payload.done) {
        return;
      } else if (payload.error){
        throw new Error(payload.error);
      }
    }
  }
}

async function handleSubmit(e){
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = "";
  resizeInput();

  history.push({ role: "user", content: text });
  addMessage("user", text);

  const msgEl = addMessage("assistant", "", true);

  try {
    const stream = sendToServerStream(historyForServer());
    for await (const delta of stream){
      updateTypingBubble(msgEl, delta);
    }

    const full = msgEl.querySelector(".bubble").textContent;
    msgEl.querySelector(".bubble").classList.remove("typing");
    history.push({ role: "assistant", content: full });
    store.save(history);
  } catch (err){
    msgEl.querySelector(".bubble").classList.remove("typing");
    msgEl.querySelector(".bubble").textContent = "⚠️ " + err.message;
  }
}

formEl.addEventListener("submit", handleSubmit);
inputEl.addEventListener("input", resizeInput);
resizeInput();

clearBtn.addEventListener("click", () => {
  history = [];
  store.clear();
  chatEl.innerHTML = "";
});

if (history.length === 0){
  addMessage("assistant", "Hey! I’m **Gemini Flash**. Ask me anything ✨");
}else{
  for (const m of history){
    addMessage(m.role, m.content);
  }
}
