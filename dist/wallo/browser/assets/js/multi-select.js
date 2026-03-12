/*======================
     multi select js
 =======================*/
var select = document.querySelector("select[multiple]");
var selectOptions = select.querySelectorAll("option");

var newSelect = document.createElement("div");
newSelect.classList.add("selectMultiple");
var active = document.createElement("div");
active.classList.add("active");
var optionList = document.createElement("ul");
var placeholder = select.dataset.placeholder;

var span = document.createElement("span");
span.innerText = placeholder;
active.appendChild(span);

selectOptions.forEach((option) => {
  let text = option.innerText;
  let item = document.createElement("li");
  item.dataset.value = option.value;
  item.innerHTML = text;

  // Handle default selected option
  if (option.selected) {
    let tag = document.createElement("a");
    tag.dataset.value = option.value;
    tag.innerHTML = "<em>" + text + "</em><i></i>";
    active.appendChild(tag);
    span.classList.add("hide");
  } else {
    optionList.appendChild(item);
  }
});

var arrow = document.createElement("div");
arrow.classList.add("arrow");
active.appendChild(arrow);

newSelect.appendChild(active);
newSelect.appendChild(optionList);

select.parentElement.append(newSelect);
span.appendChild(select);

// Function to check if the ul is empty and apply the 'empty' class
function checkIfEmpty() {
  let ul = document.querySelector(".selectMultiple ul");
  if (ul.children.length === 0) {
    ul.classList.add("empty");
  } else {
    ul.classList.remove("empty");
  }
}

// Handle selecting an option
document.querySelector(".selectMultiple ul").addEventListener("click", (e) => {
  let li = e.target.closest("li");
  if (!li) {
    return;
  }

  let select = li.closest(".selectMultiple");
  if (!select.classList.contains("clicked")) {
    select.classList.add("clicked");

    li.classList.add("remove");
    let a = document.createElement("a");
    a.dataset.value = li.dataset.value;
    a.innerHTML = "<em>" + li.innerText + "</em><i></i>";
    a.classList.add("notShown");
    select.querySelector("div").appendChild(a);

    let selectEl = select.querySelector("select");
    let opt = selectEl.querySelector(
      'option[value="' + li.dataset.value + '"]'
    );
    opt.setAttribute("selected", "selected");

    setTimeout(() => {
      a.classList.add("shown");
      select.querySelector("span").classList.add("hide");
    }, 300);

    setTimeout(() => {
      li.remove();
      select.classList.remove("clicked");
      checkIfEmpty(); // Call to check if options are empty
    }, 300);
  }
});

// Handle removing a selected option
document
  .querySelector(".selectMultiple > div")
  .addEventListener("click", (e) => {
    let a = e.target.closest("a");
    if (!a) {
      return;
    }

    let select = a.closest(".selectMultiple");
    let selectEl = select.querySelector("select");
    let opt = selectEl.querySelector('option[value="' + a.dataset.value + '"]');

    opt.removeAttribute("selected");

    a.classList.add("remove");

    setTimeout(() => {
      let li = document.createElement("li");
      li.dataset.value = a.dataset.value;
      li.innerText = a.querySelector("em").innerText;

      select.querySelector("ul").appendChild(li);

      a.remove();

      if (!selectEl.selectedOptions.length) {
        select.querySelector("span").classList.remove("hide");
      }
      checkIfEmpty(); // Call to check if options are empty
    }, 300);
  });

// Handle dropdown toggle
document
  .querySelectorAll(".selectMultiple > div .arrow, .selectMultiple > div span")
  .forEach((el) => {
    el.addEventListener("click", () => {
      el.closest(".selectMultiple").classList.toggle("open");
    });
  });

// Initial check to see if the list is empty
checkIfEmpty();
