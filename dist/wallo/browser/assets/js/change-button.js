/*======================
    change button js
=======================*/
const startBtn = document.querySelector(".ongoing-service-btn");
const restartBtn = document.querySelector(".success-bg");
const pauseBtn = document.querySelector(".error-bg");
const pauseServiceBtn = document.querySelector(".pause-service-btn");
const reasonBtn = document.querySelector(".reason-btn");
const restartServiceBtn = document.querySelector(".restart-service-btn");
const payBtn = document.querySelector(".pay-service-btn");
const doneBtn = document.querySelector(".done-service-btn");

startBtn.addEventListener("click", handleStartClick);
reasonBtn.addEventListener("click", handleReasonClick);
restartServiceBtn.addEventListener("click", handleRestartServiceClick);

function handleStartClick() {
  pauseServiceBtn.classList.add("d-flex");
  startBtn.classList.add("d-none");
  restartBtn.classList.add("d-none");
}

function handleReasonClick() {
  pauseServiceBtn.classList.add("d-flex");
  startBtn.classList.add("d-none");
  restartBtn.classList.remove("d-none");
  restartBtn.classList.add("d-block");
  pauseBtn?.classList.add("d-none");
}

function handleRestartServiceClick() {
  pauseServiceBtn.classList.add("d-flex");
  restartBtn.classList.remove("d-block");
  restartBtn.classList.add("d-none");
  startBtn.classList.add("d-none");
  pauseBtn.classList.add("d-none");
  payBtn.classList.remove("d-none");
  doneBtn.classList.add("d-none");
  payBtn.classList.add("d-block");
}
