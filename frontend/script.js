// Global variables
let currentUser = null
let currentSection = "dashboard"

// API base URL
const API_BASE = "https://dsa-tracker-e5lk.onrender.com"

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  checkAuth()
  initializeTheme()
})

// Theme management
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme") || "light"
  document.documentElement.setAttribute("data-theme", savedTheme)
  updateThemeIcon(savedTheme)
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"

  document.documentElement.setAttribute("data-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  updateThemeIcon(newTheme)
}

function updateThemeIcon(theme) {
  const themeIcon = document.querySelector(".theme-toggle i")
  if (themeIcon) {
    themeIcon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon"
  }
}

// Authentication functions
function checkAuth() {
  const token = localStorage.getItem("token")
  if (token) {
    // Verify token with server
    fetch(`${API_BASE}/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json()
        } else {
          throw new Error("Invalid token")
        }
      })
      .then((data) => {
        currentUser = data.user
        showMainApp()
        loadDashboard()
      })
      .catch((error) => {
        localStorage.removeItem("token")
        showAuth()
      })
  } else {
    showAuth()
  }
}

function showAuth() {
  document.getElementById("auth-section").style.display = "flex"
  document.getElementById("navbar").style.display = "none"
  document.getElementById("dashboard-section").style.display = "none"
  document.getElementById("leaderboard-section").style.display = "none"
}

function showMainApp() {
  document.getElementById("auth-section").style.display = "none"
  document.getElementById("navbar").style.display = "block"
  showDashboard()
}

function showLogin() {
  document.getElementById("login-form").style.display = "block"
  document.getElementById("register-form").style.display = "none"
}

function showRegister() {
  document.getElementById("login-form").style.display = "none"
  document.getElementById("register-form").style.display = "block"
}

async function login(event) {
  event.preventDefault()

  const email = document.getElementById("login-email").value
  const password = document.getElementById("login-password").value

  showLoading()

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (response.ok) {
      localStorage.setItem("token", data.token)
      currentUser = data.user
      showToast("Login successful!", "success")
      showMainApp()
      loadDashboard()
    } else {
      showToast(data.error || "Login failed", "error")
    }
  } catch (error) {
    showToast("Network error. Please try again.", "error")
  } finally {
    hideLoading()
  }
}

async function register(event) {
  event.preventDefault()

  const username = document.getElementById("register-username").value
  const email = document.getElementById("register-email").value
  const password = document.getElementById("register-password").value

  showLoading()

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    })

    const data = await response.json()

    if (response.ok) {
      localStorage.setItem("token", data.token)
      currentUser = data.user
      showToast("Account created successfully!", "success")
      showMainApp()
      loadDashboard()
    } else {
      showToast(data.error || "Registration failed", "error")
    }
  } catch (error) {
    showToast("Network error. Please try again.", "error")
  } finally {
    hideLoading()
  }
}

function logout() {
  localStorage.removeItem("token")
  currentUser = null
  showToast("Logged out successfully", "success")
  showAuth()
}

// Navigation functions
function showDashboard() {
  currentSection = "dashboard"
  document.getElementById("dashboard-section").style.display = "block"
  document.getElementById("leaderboard-section").style.display = "none"

  // Update nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active")
  })
  document.querySelector('[onclick="showDashboard()"]').classList.add("active")

  loadDashboard()
}

function showLeaderboard() {
  currentSection = "leaderboard"
  document.getElementById("dashboard-section").style.display = "none"
  document.getElementById("leaderboard-section").style.display = "block"

  // Update nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active")
  })
  document.querySelector('[onclick="showLeaderboard()"]').classList.add("active")

  loadLeaderboard()
}

// Dashboard functions
async function loadDashboard() {
  const token = localStorage.getItem("token")

  try {
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      updateDashboardUI(data)
    } else {
      showToast("Failed to load dashboard", "error")
    }
  } catch (error) {
    showToast("Network error", "error")
  }
}

function updateDashboardUI(data) {
  // Update user info
  document.getElementById("username-display").textContent = data.user.username

  // Update stats
  document.getElementById("total-score").textContent = data.user.totalScore
  document.getElementById("problems-solved").textContent = data.user.problemsSolved
  document.getElementById("easy-count").textContent = data.user.easyCount
  document.getElementById("medium-count").textContent = data.user.mediumCount
  document.getElementById("hard-count").textContent = data.user.hardCount

  // Update recent problems
  const recentProblemsContainer = document.getElementById("recent-problems")
  if (data.recentProblems.length === 0) {
    recentProblemsContainer.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary);">No problems solved yet. Add your first problem!</p>'
  } else {
    recentProblemsContainer.innerHTML = data.recentProblems
      .map(
        (problem) => `
            <div class="problem-item ${problem.difficulty.toLowerCase()}">
                <div class="problem-info">
                    <h4>${problem.title}</h4>
                    <p>Solved on ${new Date(problem.solvedAt).toLocaleDateString()}</p>
                    ${problem.link ? `<a href="${problem.link}" target="_blank" style="color: var(--primary-color); text-decoration: none;">View Problem</a>` : ""}
                </div>
                <div class="problem-meta">
                    <span class="difficulty-badge ${problem.difficulty.toLowerCase()}">${problem.difficulty}</span>
                    <span class="points">+${problem.points} pts</span>
                </div>
            </div>
        `,
      )
      .join("")
  }
}

async function addProblem(event) {
  event.preventDefault()

  const title = document.getElementById("problem-title").value
  const difficulty = document.getElementById("problem-difficulty").value
  const link = document.getElementById("problem-link").value

  const token = localStorage.getItem("token")

  showLoading()

  try {
    const response = await fetch(`${API_BASE}/problems`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, difficulty, link }),
    })

    const data = await response.json()

    if (response.ok) {
      showToast(`Problem added! +${data.problem.points} points`, "success")

      // Reset form
      document.getElementById("problem-title").value = ""
      document.getElementById("problem-difficulty").value = ""
      document.getElementById("problem-link").value = ""

      // Reload dashboard
      loadDashboard()
    } else {
      showToast(data.error || "Failed to add problem", "error")
    }
  } catch (error) {
    showToast("Network error", "error")
  } finally {
    hideLoading()
  }
}

// Leaderboard functions
async function loadLeaderboard() {
  showLoading()

  try {
    const response = await fetch(`${API_BASE}/leaderboard`)

    if (response.ok) {
      const users = await response.json()
      updateLeaderboardUI(users)
    } else {
      showToast("Failed to load leaderboard", "error")
    }
  } catch (error) {
    showToast("Network error", "error")
  } finally {
    hideLoading()
  }
}

function updateLeaderboardUI(users) {
  const leaderboardBody = document.getElementById("leaderboard-body")

  if (users.length === 0) {
    leaderboardBody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No users found</td></tr>'
    return
  }

  leaderboardBody.innerHTML = users
    .map((user, index) => {
      const rank = index + 1
      let rankClass = "rank"

      if (rank === 1) rankClass += " gold"
      else if (rank === 2) rankClass += " silver"
      else if (rank === 3) rankClass += " bronze"

      return `
            <tr>
                <td><span class="${rankClass}">#${rank}</span></td>
                <td>${user.username}</td>
                <td><strong>${user.totalScore}</strong></td>
                <td>${user.problemsSolved}</td>
                <td><span style="color: var(--success-color)">${user.easyCount}</span></td>
                <td><span style="color: var(--warning-color)">${user.mediumCount}</span></td>
                <td><span style="color: var(--danger-color)">${user.hardCount}</span></td>
            </tr>
        `
    })
    .join("")
}

// Utility functions
function showLoading() {
  document.getElementById("loading").style.display = "flex"
}

function hideLoading() {
  document.getElementById("loading").style.display = "none"
}

function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toast-container")
  const toast = document.createElement("div")
  toast.className = `toast ${type}`
  toast.textContent = message

  toastContainer.appendChild(toast)

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.remove()
  }, 3000)
}
