let timerSeconds = 25 * 60;
let timerInterval = null;

function setPomodoroMinutes(minutes) {
  timerSeconds = Number(minutes) * 60;
  renderTimer();
}

function renderTimer() {
  const target = document.querySelector('[data-timer]');
  if (!target) return;
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const s = String(timerSeconds % 60).padStart(2, '0');
  target.textContent = `${m}:${s}`;
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    timerSeconds = Math.max(0, timerSeconds - 1);
    renderTimer();
    if (timerSeconds === 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      const form = document.querySelector('[data-pomodoro-form]');
      if (form) form.classList.remove('hidden');
      alert('پومودورو تمام شد. حالا آن را برای درس/مبحث ثبت کن.');
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  setPomodoroMinutes(document.querySelector('[name="pomodoro_minutes"]')?.value || 25);
}

document.addEventListener('DOMContentLoaded', renderTimer);
