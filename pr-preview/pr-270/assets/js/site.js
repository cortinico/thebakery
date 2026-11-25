// The Developers' Bakery: the little bit of JavaScript the site needs. Everything works without it,
// this only adds the rack arrows and drag, the archive filters, clickable chapters and "Copy link".
(function () {
  'use strict';

  // ---------- Cooling rack: arrow buttons, mouse drag, arrows disabled at the ends ----------
  document.querySelectorAll('[data-rack]').forEach(function (root) {
    var list = root.querySelector('.tickets');
    var back = root.querySelector('[data-scroll="back"]');
    var fwd = root.querySelector('[data-scroll="forward"]');
    if (!list) return;
    var step = function () {
      var t = list.querySelector('.ticket-wrap');
      return (t ? t.offsetWidth : 270) + 22;
    };
    var update = function () {
      if (back) back.disabled = list.scrollLeft <= 2;
      if (fwd) fwd.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 2;
    };
    if (back) back.addEventListener('click', function () { list.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (fwd) fwd.addEventListener('click', function () { list.scrollBy({ left: step(), behavior: 'smooth' }); });
    list.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Touch devices swipe natively; this adds click-and-drag for mice.
    var startX = 0, startLeft = 0, moved = false, down = false;
    list.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = list.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; list.classList.add('dragging'); }
      if (moved) list.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () { down = false; list.classList.remove('dragging'); });
    list.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    list.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });

  // ---------- Episodes archive: format chips + search ----------
  var filters = document.querySelector('[data-filters]');
  if (filters) {
    var chips = filters.querySelectorAll('.chip');
    var input = document.getElementById('q');
    var s2 = document.getElementById('s2'), s1 = document.getElementById('s1');
    var tickets = Array.prototype.slice.call(document.querySelectorAll('#tickets .ticket-wrap'));
    var rows = Array.prototype.slice.call(document.querySelectorAll('#list li'));
    var groups = document.querySelectorAll('#list .year-group');
    var more = document.getElementById('more');
    var preview = parseInt(s1.getAttribute('data-preview'), 10) || 12;
    var filter = 'all', query = '', showAll = false;

    var params = new URLSearchParams(location.search);
    if (params.get('f')) filter = params.get('f');
    if (params.get('q')) { query = params.get('q').toLowerCase(); input.value = params.get('q'); }

    var matches = function (el) {
      return (filter === 'all' || el.getAttribute('data-format') === filter) &&
        (!query || el.getAttribute('data-search').indexOf(query) !== -1);
    };
    var render = function () {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-f') === filter)); });
      var n2 = 0;
      tickets.forEach(function (t) { var ok = matches(t); t.classList.toggle('is-hidden', !ok); if (ok) n2++; });
      var limit = showAll || query || filter === 'season-1' ? Infinity : preview;
      var n1 = 0;
      rows.forEach(function (r) { var ok = matches(r) && n1 < limit; r.hidden = !ok; if (matches(r)) n1++; });
      groups.forEach(function (g) { g.hidden = !g.querySelector('li:not([hidden])'); });
      s2.hidden = filter === 'season-1';
      s1.hidden = filter !== 'all' && filter !== 'season-1';
      document.getElementById('s2-empty').hidden = n2 > 0;
      document.getElementById('s1-empty').hidden = n1 > 0;
      more.hidden = n1 <= limit;
    };
    var sync = function () {
      var p = new URLSearchParams();
      if (filter !== 'all') p.set('f', filter);
      if (query) p.set('q', input.value.trim());
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
    };
    chips.forEach(function (c) {
      c.addEventListener('click', function () { filter = c.getAttribute('data-f'); render(); sync(); });
    });
    input.addEventListener('input', function () { query = input.value.trim().toLowerCase(); render(); sync(); });
    more.addEventListener('click', function () { showAll = true; render(); });
    render();
  }

  // ---------- Episode page: chapters ----------
  // Show notes list chapters as "- **MM.SS** Title" under a "Chapters" (or older "Show Notes") heading.
  var notes = document.querySelector('[data-notes]');
  if (notes) {
    var toSeconds = function (ts) {
      return ts.split(/[.:]/).reduce(function (acc, part) { return acc * 60 + parseInt(part, 10); }, 0);
    };
    var chapterLists = [];
    notes.querySelectorAll('h1, h2').forEach(function (h) {
      if (!/^(chapters|show notes)$/i.test(h.textContent.trim())) return;
      var list = h.nextElementSibling;
      if (!list || list.tagName !== 'UL') return;
      var items = list.querySelectorAll(':scope > li');
      var ok = items.length && Array.prototype.every.call(items, function (li) {
        var s = li.firstElementChild;
        return s && s.tagName === 'STRONG' && /^\d{1,2}([.:]\d{2}){1,2}$/.test(s.textContent.trim());
      });
      if (!ok) return;
      h.textContent = 'Chapters';
      list.classList.add('chapters');
      items.forEach(function (li) {
        var s = li.firstElementChild;
        var ts = s.textContent.trim();
        var chip = document.createElement('span');
        chip.className = 'ts';
        chip.textContent = ts.replace('.', ':');
        chip.setAttribute('data-t', String(toSeconds(ts)));
        s.replaceWith(chip);
      });
      chapterLists.push(list);
    });

    // With an episode embed, timestamps become buttons that seek the Spotify player (Spotify iFrame API).
    var frame = document.querySelector('[data-player] iframe[src*="/embed/episode/"]');
    if (frame && chapterLists.length) {
      var match = frame.src.match(/\/embed\/episode\/([A-Za-z0-9]+)/);
      window.onSpotifyIframeApiReady = function (IFrameAPI) {
        var holder = document.createElement('div');
        frame.parentNode.insertBefore(holder, frame);
        frame.style.display = 'none';
        // If the controlled player never reports ready, put the original embed back.
        var giveUp = setTimeout(function () {
          var created = holder.isConnected ? holder : frame.previousElementSibling;
          if (created && created !== frame) created.remove();
          frame.style.display = '';
        }, 10000);
        IFrameAPI.createController(holder, { uri: 'spotify:episode:' + match[1], width: '100%', height: 232 }, function (controller) {
          var wired = false;
          controller.addListener('ready', function () {
            clearTimeout(giveUp);
            if (wired) return;
            wired = true;
            frame.remove();
            chapterLists.forEach(function (list) {
              list.querySelectorAll('.ts').forEach(function (chip) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'ts';
                b.textContent = chip.textContent;
                b.setAttribute('aria-label', 'Play from ' + chip.textContent);
                b.addEventListener('click', function () {
                  controller.seek(parseInt(chip.getAttribute('data-t'), 10));
                  controller.resume();
                  document.getElementById('player').scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
                chip.replaceWith(b);
              });
              var cap = document.createElement('p');
              cap.className = 'caption';
              cap.textContent = 'Timestamps jump the Spotify player to that point.';
              list.after(cap);
            });
          });
        });
      };
      var api = document.createElement('script');
      api.src = 'https://open.spotify.com/embed/iframe-api/v1';
      api.async = true;
      api.onerror = function () { frame.style.display = ''; };
      document.body.appendChild(api);
    }
  }

  // ---------- Copy link ----------
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = function () { var t = b.textContent; b.textContent = 'Copied!'; setTimeout(function () { b.textContent = t; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(b.getAttribute('data-copy')).then(done, function () {});
    });
  });
})();
