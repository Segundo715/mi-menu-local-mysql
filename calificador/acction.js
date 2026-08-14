// ======= CONFIGURA AQUÍ TU ENLACE DE RESEÑAS DE GOOGLE =======
// Opción 1 (recomendada): usa el link corto de tu Perfil de Empresa (Panel > Solicitar reseñas)
// Ejemplo: const GOOGLE_REVIEW_URL = "https://g.page/r/XXXXXXXXXXXX/review";
// Opción 2: con Place ID -> https://search.google.com/local/writereview?placeid=PLACE_ID
const GOOGLE_REVIEW_URL = "https://g.page/r/XXXXXXXXXXXX/review"; // <-- REEMPLAZA ESTO
// ==============================================================

const stars = Array.from(document.querySelectorAll(".star"));
const hint = document.getElementById("rating-hint");
const secQueja = document.getElementById("sec-queja");
const secGoogle = document.getElementById("sec-google");
const btnGoogle = document.getElementById("btn-google");
const btnCopy = document.getElementById("btn-copy-link");

const form = document.getElementById("form-queja");
const msg = document.getElementById("msg-queja");
const btnMailto = document.getElementById("btn-mailto");

let current = 0;

function paintStars(n) {
  stars.forEach((el, i) => {
    const on = i < n;
    el.classList.toggle("active", on);
    el.classList.toggle("dim", !on);
    el.setAttribute("aria-checked", on && i === n - 1 ? "true" : "false");
  });
  hint.textContent =
    n > 0
      ? `Calificación seleccionada: ${n} ${n === 1 ? "estrella" : "estrellas"}.`
      : "Nadie verá tu correo a menos que nos lo compartas para darte seguimiento.";
}

function showSection(n) {
  const low = n > 0 && n <= 3;
  const high = n >= 4;
  secQueja.classList.toggle("show", low);
  secGoogle.classList.toggle("show", high);
  if (high) {
    btnGoogle.href = GOOGLE_REVIEW_URL;
  }
}

// Eventos de selección
stars.forEach((btn) => {
  btn.addEventListener("click", () => {
    current = Number(btn.dataset.value);
    paintStars(current);
    showSection(current);
  });
  btn.addEventListener("keydown", (e) => {
    // Navegación con flechas
    if (["ArrowRight", "ArrowUp"].includes(e.key)) {
      current = Math.min(5, (current || Number(btn.dataset.value)) + 1);
      paintStars(current);
      showSection(current);
      e.preventDefault();
    }
    if (["ArrowLeft", "ArrowDown"].includes(e.key)) {
      current = Math.max(1, (current || Number(btn.dataset.value)) - 1);
      paintStars(current);
      showSection(current);
      e.preventDefault();
    }
    if (["Enter", " "].includes(e.key)) {
      current = Number(btn.dataset.value);
      paintStars(current);
      showSection(current);
      e.preventDefault();
    }
  });
});

// Formulario de queja (simulación local; integra tu backend si lo deseas)
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const detalle = (data.detalle || "").trim();
  if (detalle.length < 10) {
    msg.textContent =
      "Por favor, cuéntanos con un poco más de detalle (mínimo 10 caracteres).";
    msg.className = "notice error";
    msg.hidden = false;
    return;
  }
  try {
    // Ejemplo de integración: reemplaza URL por tu endpoint
    // await fetch('/api/quejas', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rating: current, ...data, ts: new Date().toISOString() })});
    // Para demo: guarda en localStorage
    const list = JSON.parse(localStorage.getItem("quejas") || "[]");
    list.push({ rating: current, ...data, ts: new Date().toISOString() });
    localStorage.setItem("quejas", JSON.stringify(list));
    form.reset();
    msg.textContent =
      "¡Gracias! Hemos recibido tu comentario y lo revisaremos enseguida.";
    msg.className = "notice success";
    msg.hidden = false;
  } catch (err) {
    console.error(err);
    msg.textContent =
      "Ocurrió un error al enviar. Intenta de nuevo o usa el botón “Enviar por correo”.";
    msg.className = "notice error";
    msg.hidden = false;
  }
});

// Enviar por correo (sin backend)
btnMailto.addEventListener("click", () => {
  const asunto = encodeURIComponent(
    "[Queja] Experiencia con [Nombre del Negocio]"
  );
  const cuerpo = encodeURIComponent("Describe tu experiencia:\n\n");
  window.location.href = `mailto:soporte@tudominio.com?subject=${asunto}&body=${cuerpo}`;
});

// Copiar enlace de Google
btnCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(GOOGLE_REVIEW_URL);
    btnCopy.textContent = "¡Enlace copiado!";
    setTimeout(() => (btnCopy.textContent = "Copiar enlace"), 1500);
  } catch {
    alert("No se pudo copiar.");
  }
});

// Año dinámico
document.getElementById("year").textContent = new Date().getFullYear();

// Estado inicial visual
paintStars(0);
