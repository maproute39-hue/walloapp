/*====================
 Plus Minus Quantity Item js
=======================*/
const plusMinus = document.querySelectorAll(".plus-minus");

for (var i = 0; i < plusMinus.length; ++i) {
    const addButton = plusMinus[i].querySelector(".add");
    const subButton = plusMinus[i].querySelector(".sub");
    addButton?.addEventListener("click", function () {
        const inputEl = this.parentNode.querySelector("input[type='number']");
        if (inputEl.value < 10) {
            inputEl.value = Number(inputEl.value) + 1;
        }
    });
    subButton?.addEventListener("click", function () {
        const inputEl = this.parentNode.querySelector("input[type='number']");
        if (inputEl.value > 1) {
            inputEl.value = Number(inputEl.value) - 1;
        }
    });
}