document.getElementById('servicemen1').addEventListener('click', function () {
    var link = document.getElementById('servicemen');
    link.href = '#assign-service';
    link.setAttribute('data-bs-toggle', 'modal');
});

document.getElementById('servicemen2').addEventListener('click', function () {
    var link = document.getElementById('servicemen');
    link.href = 'assigned-servicemen-list.html';
    link.removeAttribute('data-bs-toggle');
});