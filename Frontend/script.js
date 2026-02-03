const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");
const chatBody = document.getElementById("chatBody");

const n8nWebhook = "https://tej07.app.n8n.cloud/webhook/msg3";

const FIRST_MESSAGE_KEY = "indira_first_message";


// session id
let sessionId = localStorage.getItem("chat_session");
if (!sessionId) {
  sessionId = crypto.randomUUID();
  localStorage.setItem("chat_session", sessionId);
}


function resetChat() {
  localStorage.removeItem("indira_state");
  localStorage.removeItem("chat_session");
  localStorage.removeItem("indira_first_message");
  location.reload();
}


const STATE_KEY = "indira_state";
// initialize state if not exists
let chatState = JSON.parse(localStorage.getItem(STATE_KEY));

if (!chatState) {
  chatState = {
    work_type: null,
    area_type: null,
    brand: null,
    is_ready_for_products: false,
    user_intent: "neutral"

  };
  localStorage.setItem(STATE_KEY, JSON.stringify(chatState));
}


// chat state
// FORCE RESET STATE ON PAGE LOAD (DEBUG MODE)
// localStorage.removeItem("chat_state");

// let chatState = JSON.parse(localStorage.getItem("chat_state")) || {
//   group: null,
//   category: null,
//   budget: null
// };

sendBtn.addEventListener("click", sendMessage);

function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  appendUserMessage(message);
  userInput.value = "";
  showBotLoader();


  const isFirstMessage =
  localStorage.getItem(FIRST_MESSAGE_KEY) === "true";

const payload = {
  type: "chat_message",
  message,
  sessionId,
  chatState: isFirstMessage
    ? {
        work_type: null,
        area_type: null,
        brand: null,
        is_ready_for_products: false,
        user_intent: "neutral"
      }
    : chatState,
  time: new Date().toISOString()
};

// after first message, turn it off
localStorage.setItem(FIRST_MESSAGE_KEY, "false");

fetch(n8nWebhook, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
})

    .then(res => res.json())
    .then(data => {
      hideBotLoader(); 
      console.log("RAW RESPONSE:", data);

      // handle n8n output wrapping
      // let res;
      // if (data.output) {
      //   res = typeof data.output === "string"
      //     ? JSON.parse(data.output)
      //     : data.output;
      // } else {
      //   res = data;
      // }
      const res = data; // webhook already returns final JSON


      console.log("PARSED RESPONSE:", res);

      // save updated state
     if (res.chatState) {
      chatState = res.chatState;
      localStorage.setItem(STATE_KEY, JSON.stringify(chatState));
      console.log("STATE SAVED:", chatState);
    }


      // show bot reply
      if (res.reply) {
        appendBotMessage(res.reply);
      }

      // render selectable options
      if (Array.isArray(res.options) && res.options.length) {
        renderOptions(res.options);
      }

      // render products (future-ready)
      if (Array.isArray(res.products)) {
        renderProducts(res.products);
      }

      // render comparison (future-ready)
      if (Array.isArray(res.compare)) {
        renderComparison(res.compare);
      }

      if(res.showLeadForm === true){
        renderLeadForm();
      }
    })
    .catch(err => {
      console.error("Frontend error:", err);
      appendBotMessage("Sorry, something went wrong. Please try again.");
    });
}

// ---------------- UI HELPERS ----------------

function appendUserMessage(message) {
  const html = `
    <div class="d-flex justify-content-between">
      <p class="small mb-1 text-muted">Now</p>
      <p class="small mb-1">You</p>
    </div>
    <div class="d-flex flex-row justify-content-end pt-1">
      <div>
       <p class="small p-2 me-3 mb-3 text-white rounded-3 indira-user-msg">
          ${message}
        </p>
      </div>
    </div>
  `;
  chatBody.insertAdjacentHTML("beforeend", html);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function appendBotMessage(message) {
  const html = `
    <div class="d-flex justify-content-between">
      <p class="small mb-1">Indira</p>
      <p class="small mb-1 text-muted">Now</p>
    </div>
    <div class="d-flex flex-row justify-content-start">
      <div>
        <p class="small p-2 ms-3 rounded-3 bg-body-tertiary">
          ${message}
        </p>
      </div>
    </div>
  `;
  chatBody.insertAdjacentHTML("beforeend", html);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// function renderProducts(products) {
//   const wrapper = document.createElement("div");
//   wrapper.className = "d-flex gap-2 overflow-auto ms-4";

//   products.slice(0, 5).forEach(p => {

//     //  SAFETY CHECK
//     if (!p.url) {
//       console.warn("Product missing URL:", p);
//       return; // skip this product safely
//     }

//     const url = p.url.startsWith("http")
//       ? p.url
//       : "https://" + p.url;

//     // const html = `
//     //   <a href="${url}" target="_blank" style="text-decoration:none;">
//     //     <div class="card" style="min-width:220px; cursor:pointer;">
//     //       <img src="${p.image}" class="card-img-top">
//     //       <hr/>
//     //       <div class="card-body p-2">
//     //         <h6>${p.name}</h6>
//     //         <strong class="indira-price">₹${p.price}</strong>
//     //         <p class="small mt-1">${p.description || ""}</p>
//     //       </div>
//     //     </div>
//     //   </a>
//     // `;

//     const html = `
//       <a href="${url}" target="_blank" class="product-link">
//   <div class="product-card">

//     <div class="product-image">
//       <img src="${p.image}" alt="${p.name}">
//     </div>

//     <div class="product-content">
//       <h6 class="product-title">${p.name}</h6>

//       <p class="product-desc">
//         ${p.description }
//       </p>

//       <div class="product-footer">
//         <span class="product-price">₹${p.price}</span>
//         <span class="product-cta">View details →</span>
//       </div>
//     </div>

//   </div>
// </a>


//     `;

//     wrapper.insertAdjacentHTML("beforeend", html);
//   });

//   chatBody.appendChild(wrapper);
//   chatBody.scrollTop = chatBody.scrollHeight;
// }


//-------------render products new-------------

function renderProducts(products) {
  const wrapper = document.createElement("div");
  wrapper.className = "d-flex gap-2 overflow-auto ms-4";

  products.slice(0, 5).forEach(p => {
    // Safety checks
    if (!p.product_page_url || !p.add_to_cart_url) {
      console.warn("Product missing URLs:", p);
      return;
    }

    const html = `
      <div class="product-card" style="min-width:240px; cursor:pointer;">

        <!-- PRODUCT CLICK AREA -->
        <div class="product-info"
             onclick="window.open('${p.product_page_url}', '_blank')">

          <div class="product-image">
            <img src="${p.image}" alt="${p.name}" style="width:100%; border-radius:8px;">
          </div>

          <div class="product-content">
            <h6 class="product-title mt-2">${p.name}</h6>
            <p class="small text-muted">${p.description || ""}</p>
            <strong class="indira-price">₹${p.price}</strong>
          </div>
        </div>

        <!-- ADD TO CART BUTTON -->
        <button
          class="add-to-cart-btn mt-2"
          onclick="event.stopPropagation(); window.open('${p.add_to_cart_url}', '_blank')"
          style="
            width:100%;
            padding:8px;
            border-radius:6px;
            background:#000;
            color:#fff;
            border:none;
            cursor:pointer;
          "
        >
          Add to Cart 🛒
        </button>

      </div>
    `;

    wrapper.insertAdjacentHTML("beforeend", html);
  });

  chatBody.appendChild(wrapper);
  chatBody.scrollTop = chatBody.scrollHeight;
}




//options rendering

function renderOptions(options) {
  // remove old options if any
  const old = document.getElementById("chat-options");
  if (old) old.remove();

  const wrapper = document.createElement("div");
  wrapper.id = "chat-options";
  wrapper.className = "chat-options";

  options
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .forEach(option => {
      const btn = document.createElement("button");
      btn.className = "chat-option-btn";
      btn.innerText = option;

      btn.onclick = () => {
        wrapper.remove();
        appendUserMessage(option);
        sendOption(option);
      };

      wrapper.appendChild(btn);
    });

  chatBody.appendChild(wrapper);
  chatBody.scrollTop = chatBody.scrollHeight;
}


function sendOption(optionText) {
  showBotLoader();

  fetch(n8nWebhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: optionText,
      sessionId,
      chatState: chatState
    })
  })
    .then(res => res.json())
    .then(data => {
      hideBotLoader();

      let res = data.output
        ? typeof data.output === "string"
          ? JSON.parse(data.output)
          : data.output
        : data;

      // SAVE STATE CORRECTLY
      if (res.chatState) {
        chatState = res.chatState;
        localStorage.setItem(STATE_KEY, JSON.stringify(chatState));
      }

      if (res.reply) appendBotMessage(res.reply);
      if (Array.isArray(res.options)) renderOptions(res.options);
      if (Array.isArray(res.products)) renderProducts(res.products);
    })
    .catch(() => {
      hideBotLoader();
      appendBotMessage("Something went wrong.");
    });
}



function renderComparison(compare) {
  const rows = compare.map(c => `
    <tr>
      <td>${c.feature}</td>
      <td>${c.product1}</td>
      <td>${c.product2}</td>
    </tr>
  `).join("");

  const html = `
    <div class="ms-4 mt-2">
      <table class="table table-sm table-bordered">
        <thead class="table-light">
          <tr>
            <th>Feature</th>
            <th>Option 1</th>
            <th>Option 2</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  chatBody.insertAdjacentHTML("beforeend", html);
  chatBody.scrollTop = chatBody.scrollHeight;

}


// ---------------- FORM DISPLAY ----------------

// function renderLeadForm() {
//   const html = `
//     <div class="lead-form ms-3 mt-2 p-3 rounded border">
//       <p class="small mb-2"><strong>Let our team help you 😊</strong></p>

//       <input type="text" id="lead-name" class="form-control mb-2" placeholder="Your Name" />

//       <input type="tel" id="lead-phone" class="form-control mb-2" placeholder="Phone Number" />

//       <textarea id="lead-msg" class="form-control mb-2" placeholder="Your requirement (optional)"></textarea>

//       <button class="btn btn-primary btn-sm" onclick="submitLeadForm()">
//         Request Callback
//       </button>
//     </div>
//   `;

//   chatBody.insertAdjacentHTML("beforeend", html);
//   chatBody.scrollTop = chatBody.scrollHeight;
// }

function renderLeadForm() {
  const html = `
    <div id="lead-form" class="lead-form ms-3 mt-2 p-3 rounded border">
      <p class="small mb-2"><strong>Let our team help you 😊</strong></p>

      <input type="text" id="lead-name" class="form-control mb-2" placeholder="Your Name" />
      <input type="tel" id="lead-phone" class="form-control mb-2" placeholder="Phone Number" />
      <textarea id="lead-msg" class="form-control mb-2" placeholder="Your requirement (optional)"></textarea>

      <button class="btn btn-primary btn-sm" onclick="submitLeadForm()">
        Request Callback
      </button>
    </div>
  `;

  chatBody.insertAdjacentHTML("beforeend", html);
  chatBody.scrollTop = chatBody.scrollHeight;
}


// ---------------- SUBMITFORM ----------------
// function submitLeadForm() {
//   const name = document.getElementById("lead-name").value.trim();
//   const phone = document.getElementById("lead-phone").value.trim();
//   const msg = document.getElementById("lead-msg").value.trim();

//   if (!name || !phone) {
//     alert("Please enter name and phone number");
//     return;
//   }

//   fetch(n8nWebhook, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({
//       type: "lead_capture",

//       // lead data
//       name,
//       phone,
//       leadMessage: msg,

//       // chat context
//       lastUserMessage: "iam confused", // optional
//       chatState,

//       // session
//       sessionId,
//       time: new Date().toISOString()
//     })
//   });

//   appendBotMessage(
//     " Thank you! Our team will contact you shortly."
//   );
// }

function submitLeadForm() {
  const name = document.getElementById("lead-name").value.trim();
  const phone = document.getElementById("lead-phone").value.trim();
  const msg = document.getElementById("lead-msg").value.trim();

  if (!name || !phone) {
    alert("Please enter name and phone number");
    return;
  }

  fetch(n8nWebhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "lead_capture",
      name,
      phone,
      leadMessage: msg,
      chatState,
      sessionId,
      time: new Date().toISOString()
    })
  });

  // ✅ REMOVE FORM AFTER SUBMIT
  const form = document.getElementById("lead-form");
  if (form) form.remove();

  // ✅ CONFIRMATION MESSAGE
  appendBotMessage("Thank you! 😊 Our team will contact you shortly.");
}


// ---------------- CHAT WINDOW TOGGLE ----------------

const chatbotButton = document.getElementById("chatbot-button");
const chatbotWindow = document.getElementById("chatbot-window");

chatbotButton.addEventListener("click", () => {
  chatbotWindow.classList.toggle("hidden");
});


function showBotLoader() {
  // prevent duplicate loaders
  if (document.getElementById("bot-loader")) return;

  const html = `
    <div id="bot-loader">
      <div class="d-flex justify-content-between">
        <p class="small mb-1">Indira</p>
        <p class="small mb-1 text-muted">Now</p>
      </div>
      <div class="d-flex flex-row justify-content-start">
        <div class="bot-loader-bubble ms-3">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;

  chatBody.insertAdjacentHTML("beforeend", html);
  chatBody.scrollTop = chatBody.scrollHeight;
}


function hideBotLoader() {
  const loader = document.getElementById("bot-loader");
  if (loader) loader.remove();
}


window.addEventListener("load", () => {
  localStorage.setItem(FIRST_MESSAGE_KEY, "true");

  hideBotLoader();
  appendBotMessage(
    "Hi, I’m Indira 😊 Welcome! How may I help you today?"
  );
});


function resetChat() {
  localStorage.clear();
  location.reload();
}

