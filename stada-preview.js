const today = new Date();
const exam = new Date("2027-05-07T00:00:00+03:30");
const days = Math.ceil((exam - today) / 86400000);
document.querySelector("[data-days]").textContent = days.toLocaleString("fa-IR");

const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");
tabs.forEach((tab) => {
  tab.addEventListener("click", (event) => {
    event.preventDefault();
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    panels.forEach((panel) => {
      panel.style.display = panel.dataset.panel === tab.dataset.tab ? "block" : "none";
    });
  });
});

let timerSeconds = 25 * 60;
let timerInterval = null;
function renderTimer() {
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const s = String(timerSeconds % 60).padStart(2, "0");
  document.querySelector("[data-timer]").textContent = `${m}:${s}`;
}
window.startTimer = function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timerSeconds = Math.max(0, timerSeconds - 1);
    renderTimer();
    if (timerSeconds === 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      alert("پومودورو تمام شد. در نسخه اصلی می‌توانی آن را به مطالعه تبدیل کنی.");
    }
  }, 1000);
};
window.pauseTimer = function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
};
window.resetTimer = function resetTimer() {
  pauseTimer();
  timerSeconds = 25 * 60;
  renderTimer();
};
renderTimer();
