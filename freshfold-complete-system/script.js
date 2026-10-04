function setMode(mode){
  const isLogin = mode === 'login';
  document.getElementById('view-login').style.display = isLogin ? 'block' : 'none';
  document.getElementById('view-register').style.display = isLogin ? 'none' : 'block';
  document.getElementById('tab-login').setAttribute('aria-selected', isLogin);
  document.getElementById('tab-register').setAttribute('aria-selected', !isLogin);
}

const API_BASE = 'http://localhost:8000/api';

async function demoSubmit(e, type){
  e.preventDefault();
  const err = document.getElementById(type + '-error');
  err.classList.remove('show');

  const payload = type === 'login'
    ? {
        email: document.getElementById('li-email').value,
        password: document.getElementById('li-pass').value,
      }
    : {
        name: document.getElementById('re-name').value,
        email: document.getElementById('re-email').value,
        phone: document.getElementById('re-phone').value,
        password: document.getElementById('re-pass').value,
      };

  try {
    const res = await fetch(`${API_BASE}/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      err.textContent = data.message || 'Something went wrong. Please try again.';
      err.classList.add('show');
      return false;
    }

    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
    window.location.href = 'dashboard.html';
  } catch (networkError) {
    err.textContent = 'Could not reach the server. Is the API running?';
    err.classList.add('show');
  }
  return false;
}
