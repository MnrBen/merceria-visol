/* =========================================================
   Mercería Visol · v2 (varias páginas)
   JS mínimo. Si falla, todas las páginas se ven enteras igual:
   el horario está escrito en la tabla y la galería muestra todas
   las fotos; solo se pierden el aviso de "abierto ahora / cerrado",
   los filtros y la animación de la cinta.
   ========================================================= */

(function () {
  'use strict';

  var parametros = new URLSearchParams(location.search);
  var raiz = document.documentElement;

  /* ---------- Modo limpio: ?limpio oculta las marcas [CONFIRMAR] ---------- */
  if (parametros.has('limpio')) raiz.classList.add('limpio');

  /* ---------- Animaciones: solo con JS y si no se pide menos movimiento ---------- */
  var conMovimiento = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (conMovimiento) raiz.classList.add('anima');

  iniciarHorario();
  iniciarGaleria();

  /* =========================================================
     Horario: abierto ahora / cerrado (Inicio y Contacto)
     ========================================================= */
  function iniciarHorario() {
    // Los tramos se leen de la propia tabla (data-dias y data-tramos), así el
    // horario solo está escrito en un sitio. Una fila puede valer para varios días.
    var filas = document.querySelectorAll('.horario tr[data-dias]');
    var estado = document.querySelector('[data-estado]');
    var estadoCorto = document.querySelector('[data-estado-corto]');
    if (!filas.length || !estado) return;

    var NOMBRES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var horario = {};
    filas.forEach(function (fila) {
      var tramos = fila.getAttribute('data-tramos').trim();
      var lista = tramos ? tramos.split(/\s+/).map(function (t) {
        var partes = t.split('-');
        return [aMinutos(partes[0]), aMinutos(partes[1])];
      }) : [];
      diasDe(fila).forEach(function (dia) { horario[dia] = lista; });
    });

    function diasDe(fila) {
      return fila.getAttribute('data-dias').trim().split(/\s+/);
    }

    function aMinutos(hhmm) {
      var p = hhmm.split(':');
      return +p[0] * 60 + +p[1];
    }

    function aTexto(minutos) {
      var m = minutos % 60;
      return Math.floor(minutos / 60) + ':' + (m < 10 ? '0' : '') + m;
    }

    // Día y minuto actuales en hora de la tienda (Europe/Madrid), sea cual sea
    // la zona horaria del móvil. ?ahora=2026-10-26T10:00 simula una hora (pruebas).
    function ahoraEnTienda() {
      var simulada = parametros.get('ahora');
      if (simulada) {
        var f = new Date(simulada);
        if (!isNaN(f)) return { dia: f.getDay(), minuto: f.getHours() * 60 + f.getMinutes() };
      }
      var partes = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date());
      var valor = {};
      partes.forEach(function (p) { valor[p.type] = p.value; });
      var dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(valor.weekday);
      return { dia: dia, minuto: +valor.hour * 60 + +valor.minute };
    }

    function calcular(ahora) {
      // ¿Dentro de algún tramo de hoy?
      var hoy = horario[ahora.dia] || [];
      for (var i = 0; i < hoy.length; i++) {
        if (ahora.minuto >= hoy[i][0] && ahora.minuto < hoy[i][1]) {
          return { abierto: true, texto: 'cierra a las ' + aTexto(hoy[i][1]) };
        }
      }

      // Si no, la próxima apertura (hoy más tarde o en los días siguientes)
      for (var d = 0; d < 8; d++) {
        var dia = (ahora.dia + d) % 7;
        var tramos = horario[dia] || [];
        for (var j = 0; j < tramos.length; j++) {
          if (d > 0 || tramos[j][0] > ahora.minuto) {
            var cuando = d === 0 ? 'hoy' : d === 1 ? 'mañana' : 'el ' + NOMBRES[dia];
            return { abierto: false, texto: 'abre ' + cuando + ' a las ' + aTexto(tramos[j][0]) };
          }
        }
      }
      return { abierto: false, texto: '' };
    }

    function pintar() {
      var ahora = ahoraEnTienda();
      var r = calcular(ahora);
      var clase = r.abierto ? 'abierto' : 'cerrado';
      var titular = r.abierto ? 'Abierto ahora' : 'Cerrado ahora';
      var html = '<span class="punto" aria-hidden="true"></span><span><strong>' + titular + '</strong>' +
        (r.texto ? ' · ' + r.texto : '') + '</span>';

      // Solo se reescribe si cambia, para que un lector de pantalla no lo repita cada minuto
      if (estado.innerHTML === html) return;
      estado.className = 'estado ' + clase;
      estado.innerHTML = html;
      estado.hidden = false;

      if (estadoCorto) {
        estadoCorto.className = 'estado-corto ' + clase;
        estadoCorto.innerHTML = html;
      }

      // Resalta el día de hoy en la tabla
      var diaHoy = String(ahora.dia);
      filas.forEach(function (fila) {
        fila.classList.toggle('hoy', diasDe(fila).indexOf(diaHoy) !== -1);
      });
    }

    pintar();
    setInterval(pintar, 60 * 1000);
  }

  /* =========================================================
     Galería de Productos: filtros por sección
     La dirección refleja el filtro (productos.html?ver=merceria),
     así un enlace puede abrir la galería ya filtrada.
     ========================================================= */
  function iniciarGaleria() {
    var barra = document.querySelector('[data-filtros]');
    var galeria = document.querySelector('[data-galeria]');
    if (!barra || !galeria) return;

    var botones = barra.querySelectorAll('[data-filtro]');
    var elementos = document.querySelectorAll('[data-cat]');
    var resultado = document.querySelector('[data-resultado]');
    var NOMBRES = { todo: 'todas las secciones', merceria: 'mercería', lenceria: 'lencería y complementos' };

    function aplicar(filtro, actualizarDireccion) {
      if (!NOMBRES[filtro]) filtro = 'todo';

      botones.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-filtro') === filtro));
      });

      var fotos = 0;
      elementos.forEach(function (el) {
        var visible = filtro === 'todo' || el.getAttribute('data-cat') === filtro;
        var estabaOculto = el.hidden;
        el.hidden = !visible;
        if (visible && el.classList.contains('galeria__item')) {
          fotos++;
          // Pequeña entrada al aparecer (solo al cambiar de filtro)
          if (estabaOculto && conMovimiento) {
            el.classList.remove('aparece');
            void el.offsetWidth;
            el.classList.add('aparece');
          }
        }
      });

      if (resultado) resultado.textContent = 'Mostrando ' + fotos + ' fotos de ' + NOMBRES[filtro] + '.';

      if (actualizarDireccion) {
        var p = new URLSearchParams(location.search);
        if (filtro === 'todo') p.delete('ver'); else p.set('ver', filtro);
        var consulta = p.toString();
        history.replaceState(null, '', location.pathname + (consulta ? '?' + consulta : '') + location.hash);
      }
    }

    botones.forEach(function (b) {
      b.addEventListener('click', function () { aplicar(b.getAttribute('data-filtro'), true); });
    });

    barra.hidden = false;
    aplicar(parametros.get('ver') || 'todo', false);
  }
})();
