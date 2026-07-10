// Talks to the Express API in this same project (routes/auth.js).
// Since server.js serves this /public folder itself, relative paths work
// whether you're running locally or deployed.
const API_BASE = "/api/auth";

function showAuthMessage(text, type) {
  const box = document.getElementById("auth-message");
  if (!box) return;
  box.textContent = text;
  box.className = type; // "error" or "success"
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
}

async function submitAuth(endpoint, payload) {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

function saveSession(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
}

// ---- Login form ----
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = loginForm.querySelector("button[type='submit']");
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    setButtonLoading(submitBtn, true, "Logging in...", "Log in");

    try {
      const data = await submitAuth("login", { email, password });
      saveSession(data);
      showAuthMessage("Logged in! Redirecting...", "success");
      setTimeout(() => (window.location.href = "index.html"), 600);
    } catch (err) {
      showAuthMessage(err.message, "error");
      setButtonLoading(submitBtn, false, "Logging in...", "Log in");
    }
  });
}

// ---- Register form ----
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = registerForm.querySelector("button[type='submit']");
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (password.length < 8) {
      showAuthMessage("Password must be at least 8 characters.", "error");
      return;
    }

    setButtonLoading(submitBtn, true, "Creating account...", "Create account");

    try {
      const data = await submitAuth("register", { name, email, password });
      saveSession(data);
      showAuthMessage("Account created! Redirecting...", "success");
      setTimeout(() => (window.location.href = "index.html"), 600);
    } catch (err) {
      showAuthMessage(err.message, "error");
      setButtonLoading(submitBtn, false, "Creating account...", "Create account");
    }
  });
}

// ---- Shared header state (runs on every page that includes this script) ----
function renderHeaderAuthState() {
  const container = document.getElementById("login-register");
  if (!container) return;

  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  if (token && userRaw) {
    const user = JSON.parse(userRaw);
    const firstName = user.name ? user.name.split(" ")[0] : "there";
    container.innerHTML = `
      <span style="font-family: var(--roboto); font-size: 14px;">Hi, ${firstName}</span>
      <button class="button" id="white-button" type="button" data-logout>Log out</button>
    `;
    container.querySelector("[data-logout]").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "index.html";
    });
  }
}

renderHeaderAuthState();
