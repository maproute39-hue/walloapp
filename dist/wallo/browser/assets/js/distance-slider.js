/*=====================
    distance Slider
========================*/
const progressBarClickHandler = (event) => {
  progressPositionHandler(event);
};
const sliderOnChangeHandler = () => {
  const slider = document.getElementById("slider");
  const bar = document.getElementById("progress-bar");
  bar.classList.add("remove-transition");
  slider.classList.add("remove-transition");
  document.addEventListener("mousemove", progressPositionHandler);
  document.addEventListener("mouseup", function () {
    bar.classList.remove("remove-transition");
    slider.classList.remove("remove-transition");
    document.removeEventListener("mousemove", progressPositionHandler);
  });
};
const progressPositionHandler = (event) => {
  const progressBar = document.getElementById("progress-bar-wrap");
  const bar = document.getElementById("progress-bar");
  const barSlider = document.getElementById("slider");
  const rect = progressBar.getBoundingClientRect();
  let posX = ((event.clientX - rect.left) / rect.width) * 100;
  if (event.clientX < rect.left) {
    posX = 0;
  } else if (event.clientX > rect.right) {
    posX = 100;
  }
  bar.style.width = posX + "%";
  barSlider.style.left = posX + "%";
};
