// Controls the slider using from Input....
function controlFromInput(fromSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, "#F6F7F9", "#f58218", controlSlider);
  fromSlider.value = from;

  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromSlider.value = from;
  }
}

// Controls the slider using to Input....
function controlToInput(toSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, "#F6F7F9", "#f58218", controlSlider);
  setToggleAccessible(toInput);
  toSlider.value = to;
  toInput.value = to;

  if (from <= to) {
    toSlider.value = to;
    toInput.value = to;
  } else {
    toInput.value = from;
  }
}

// Sliding event of the From slider
function controlFromSlider(fromSlider, toSlider, fromInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, "#F6F7F9", "#f58218", toSlider);
  fromInput.value = from;
  if (from > to) {
    fromInput.value = to;
    toInput.value = from;
  }
}

// Sliding event of the To slider
function controlToSlider(fromSlider, toSlider, toInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, "#F6F7F9", "#f58218", toSlider);
  setToggleAccessible(toSlider);
  toSlider.value = to;
  toInput.value = to;
  if (from > to) {
    fromInput.value = to;
    toInput.value = from;
  }
}

// Parsign values of the Inputs
function getParsed(currentFrom, currentTo) {
  const from = parseInt(currentFrom.value, 10);
  const to = parseInt(currentTo.value, 10);
  return [from, to];
}

// Changing and Filling the color in the selected part...
function fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
  let rangeDistance = to.max - to.min;
  let fromPosition = from.value - to.min;
  let toPosition = to.value - to.min;
  if (fromPosition > toPosition) {
    let spare = fromPosition;
    fromPosition = toPosition;
    toPosition = spare;
  }
  controlSlider.style.background = `linear-gradient(
  to right,
  ${sliderColor} 0%,
  ${sliderColor} ${(fromPosition / rangeDistance) * 100}%,
  ${rangeColor} ${(fromPosition / rangeDistance) * 100}%,
  ${rangeColor} ${(toPosition / rangeDistance) * 100}%, 
  ${sliderColor} ${(toPosition / rangeDistance) * 100}%, 
  ${sliderColor} 100%)`;
}

/*=====================
    Ranger Slider
==========================*/
// Making sure the toggle which we are using is accesible to change the range
function setToggleAccessible(currentTarget) {
  const toSlider = document.querySelector("#toSlider");
  if (Number(currentTarget.value) <= 0) {
    toSlider.style.zIndex = 2;
  } else {
    toSlider.style.zIndex = 0;
  }
}

const fromSlider = document.querySelector("#fromSlider");
const toSlider = document.querySelector("#toSlider");
const fromInput = document.querySelector("#fromInput");
const toInput = document.querySelector("#toInput");

// Initially filling the slider using default values...
fillSlider(fromSlider, toSlider, "#F6F7F9", "#f58218", toSlider);
setToggleAccessible(toSlider);

// Assigning listner methonds to respective events.
fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput);
toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput);
fromInput.oninput = () =>
  controlFromInput(fromSlider, fromInput, toInput, toSlider);
toInput.oninput = () => controlToInput(toSlider, fromInput, toInput, toSlider);
