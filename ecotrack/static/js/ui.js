document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.toast').forEach((toast) => {
    new bootstrap.Toast(toast, { delay: 4500 }).show();
  });

  const loader = document.getElementById('pageLoader');
  if (loader) {
    requestAnimationFrame(() => loader.classList.add('loaded'));
  }

  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', () => {
      if (loader) loader.classList.remove('loaded');
    });
  });
});
