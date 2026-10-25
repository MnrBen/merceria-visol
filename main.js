/* =========================================================
   Mercería Visol · demo
   JS mínimo. Si falla, la página se ve entera igual: el horario
   está escrito en la tabla y solo se pierde el aviso de
   "abierto ahora / cerrado".
   ========================================================= */

(function () {
  'use strict';

  var parametros = new URLSearchParams(location.search);

  /* ---------- Modo limpio: ?limpio oculta las marcas [CONFIRMAR] ---------- */
  if (parametros.has('limpio')) document.documentElement.classList.add('limpio');

  /* ---------- Horario: abierto ahora / cerrado ---------- */
  // Los tramos se leen de la propia tabla (data-tramos), así el horario
  // solo está escrito en un sitio.
  var filas = document.querySelectorAll('.horario tr[data-dia]');
  var estado = document.querySelector('[data-estado]');
  var estadoCorto = document.querySelector('[data-estado-corto]');
  if (!filas.length || !estado) return;

  var NOMBRES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var horario = {};
  filas.forEach(function (fila) {
    var tramos = fila.getAttribute('data-tramos').trim();
    horario[fila.getAttribute('data-dia')] = tramos ? tramos.split(/\s+/).map(function (t) {
      var partes = t.split('-');
      return [aMinutos(partes[0]), aMinutos(partes[1])];
    }) : [];
  });

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

  function calcular() {
    var ahora = ahoraEnTienda();

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
    var r = calcular();
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
    var diaHoy = String(ahoraEnTienda().dia);
    filas.forEach(function (fila) {
      fila.classList.toggle('hoy', fila.getAttribute('data-dia') === diaHoy);
    });
  }

  pintar();
  setInterval(pintar, 60 * 1000);
})();
