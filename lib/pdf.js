/* Export PDF des étiquettes — échelle réelle : 17,5 mm par module, format A4. */
(function (g) {
  'use strict';
  var MOD = 17.5;           // largeur d'un module, en mm
  var PT = 0.3528;          // 1 pt en mm
  var A4L = { w: 297, h: 210 }, A4P = { w: 210, h: 297 };
  var MARGIN = 8;
  var DATA = g.EAR_DATA, ICONS = g.EAR_ICONS;

  // Les polices standard PDF utilisent WinAnsi : on normalise les caractères hors Latin-1.
  function clean(s) {
    return String(s == null ? '' : s)
      .replace(/[\u2018\u2019\u02BC]/g, "'").replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
      .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/\u0153/g, 'oe').replace(/\u0152/g, 'OE')
      .replace(/[\u00A0\u202F]/g, ' ').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '');
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? m[3] + '/' + m[2] + '/' + m[1] : iso;
  }
  function slug(s) {
    return (String(s || 'chantier').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'chantier').slice(0, 40);
  }
  function fileName(p) { return 'etiquettes-' + (p.client ? slug(p.client) + '-' : '') + (p.date || new Date().toISOString().slice(0, 10)) + '.pdf'; }

  // Position (en modules) de chaque appareil d'une rangée
  function layout(row) {
    var pos = 0, items = [];
    row.devices.forEach(function (d, i) {
      var w = Math.max(0, Number(d.w) || 0);
      items.push({ d: d, i: i, start: pos, end: pos + w });
      pos += w;
    });
    return { items: items, used: pos, total: Math.max(pos, Number(row.modules) || 0) };
  }

  // Découpe une rangée trop longue pour la page en morceaux (coupure entre deux appareils)
  function pieces(lay, maxM) {
    var out = [], a = 0, total = lay.total;
    var cands = {};
    lay.items.forEach(function (it) { cands[it.start] = 1; cands[it.end] = 1; });
    for (var m = Math.ceil(lay.used); m <= total; m++) cands[m] = 1;
    cands[total] = 1;
    var list = Object.keys(cands).map(Number).sort(function (x, y) { return x - y; });
    while (a < total - 1e-9) {
      var lim = a + maxM, b = null;
      if (total <= lim + 1e-9) b = total;
      else list.forEach(function (c) { if (c > a + 1e-9 && c <= lim + 1e-9) b = c; });
      if (b === null) b = lim;
      out.push([a, b]);
      a = b;
    }
    // Une bande n'est imprimée que si elle contient au moins un appareil (rangée vide : aucune bande)
    return out.filter(function (pc) {
      return lay.items.some(function (it) { return it.d.type !== 'vide' && it.end > it.start && it.end > pc[0] + 1e-9 && it.start < pc[1] - 1e-9; });
    });
  }

  function fitFont(doc, text, maxW, start, min) {
    var fs = start;
    doc.setFontSize(fs);
    while (fs > min && doc.getTextWidth(text) > maxW) { fs -= 0.25; doc.setFontSize(fs); }
    if (doc.getTextWidth(text) > maxW) {
      while (text.length > 1 && doc.getTextWidth(text + '.') > maxW) text = text.slice(0, -1);
      text += '.';
    }
    return { fs: fs, text: text };
  }

  function drawCell(doc, x, y, w, h, d) {
    var big = h >= 20, pad = Math.min(0.9, w * 0.08);
    var t = DATA.TYPES[d.type] || DATA.TYPES.autre;
    var abbr = DATA.typeAbbr(d), cal = DATA.calText(d).replace(' ', '');
    var head = clean([abbr, cal].filter(Boolean).join(' '));
    var label = clean(d.label || (d.type === 'autre' ? '' : t.court));
    var cy = y + pad;
    if (d.type === 'diff') {           // bandeau gris pour repérer les différentiels
      doc.setFillColor(228, 232, 231);
      doc.rect(x + 0.1, y + 0.1, w - 0.2, (big ? 4.6 : 3.4), 'F');
    }
    doc.setTextColor(0);
    if (head) {
      doc.setFont('helvetica', 'bold');
      var f = fitFont(doc, head, w - 2 * pad, big ? 7.5 : 5.6, 3.2);
      cy += f.fs * PT * 0.85;
      doc.text(f.text, x + w / 2, cy, { align: 'center' });
      cy += big ? 1.3 : 0.7;
    }
    var bottom = y + h - pad;
    var icon = d.icon || (d.type === 'diff' ? 'diff' : '');
    var avail = bottom - cy;
    var side = !!icon && w >= 26;
    var isz = 0;
    if (icon) isz = Math.max(0, Math.min(big ? 8 : 5, w - 2 * pad, avail * (side ? 0.95 : 0.5)));
    doc.setDrawColor(0);
    if (icon && isz >= 2.5) {
      if (side) ICONS.pdf(doc, icon, x + pad + 0.3, cy + (avail - isz) / 2, isz);
      else { ICONS.pdf(doc, icon, x + (w - isz) / 2, cy, isz); cy += isz + 0.5; }
    } else side = false;
    if (!label) return;
    var tx = side ? x + pad + isz + 1.2 : x + pad, tw = side ? (x + w - pad) - tx : w - 2 * pad;
    var ah = bottom - cy;
    doc.setFont('helvetica', 'normal');
    var fs = big ? 8.5 : 6, lines, lh, maxLines;
    for (;;) {
      doc.setFontSize(fs);
      lines = doc.splitTextToSize(label, tw);
      lh = fs * PT * 1.12;
      maxLines = Math.max(1, Math.floor((ah + fs * PT * 0.2) / lh));
      var wide = lines.some(function (l) { return doc.getTextWidth(l) > tw + 0.01; }) ||
        label.split(/\s+/).some(function (wd) { return doc.getTextWidth(wd) > tw + 0.01; });
      if ((lines.length <= maxLines && !wide) || fs <= 3.6) break;
      fs -= 0.25;
    }
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = fitFont(doc, lines[maxLines - 1] + '...', tw, fs, fs).text;
    }
    var blockH = lines.length * lh;
    var ly = cy + Math.max(0, (ah - blockH) / 2) + fs * PT * 0.82;
    lines.forEach(function (l, k) {
      if (side) doc.text(l, tx, ly + k * lh);
      else doc.text(l, x + w / 2, ly + k * lh, { align: 'center' });
    });
  }

  function cropMarks(doc, x, y, w, h) {
    var g = 1, l = 3;
    doc.setDrawColor(0); doc.setLineWidth(0.1);
    [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]].forEach(function (c) {
      doc.line(c[0] + c[2] * g, c[1], c[0] + c[2] * (g + l), c[1]);
      doc.line(c[0], c[1] + c[3] * g, c[0], c[1] + c[3] * (g + l));
    });
  }

  // Coordonnées de l'entreprise (Paramètres) : null si désactivées
  function brandOf(opts) {
    var b = opts && opts.brand;
    return b && b.on ? b : null;
  }
  function contactLine(b, sep) {
    return clean([b.tel ? 'Tél. ' + b.tel : '', b.mail, b.addr].filter(Boolean).join(sep || '  ·  '));
  }
  // Logo dans une boîte maxW × maxH (mm), aligné en haut à gauche ; renvoie la largeur utilisée
  function drawLogo(doc, b, x, y, maxW, maxH) {
    if (!b || !b.logo || !b.logo.data) return 0;
    var r = (b.logo.w || 1) / (b.logo.h || 1), h = maxH, w = h * r;
    if (w > maxW) { w = maxW; h = w / r; }
    try { doc.addImage(b.logo.data, /^data:image\/jpe?g/.test(b.logo.data) ? 'JPEG' : 'PNG', x, y + (maxH - h) / 2, w, h); } catch (e) { return 0; }
    return w;
  }
  // QR code (bibliothèque qrcode-generator) : niveau M, repli en L si le code devient trop dense
  function qrMatrix(text) {
    var Q = g.qrcode;
    if (!Q || !text) return null;
    var levels = ['M', 'L'], qr = null, lv;
    for (var i = 0; i < levels.length; i++) {
      lv = levels[i];
      try {
        qr = Q(0, lv);
        // Préfixe (https://…/#/f/) en octets, données base32 en mode alphanumérique (plus compact)
        var m = /^(.*#\/f\/)([0-9A-Z]+)$/.exec(text);
        if (m) { qr.addData(m[1], 'Byte'); qr.addData(m[2], 'Alphanumeric'); } else qr.addData(text, 'Byte');
        qr.make();
      } catch (e) { qr = null; continue; }
      if (qr.getModuleCount() <= 69 || i === levels.length - 1) break;   // ≤ version 13 en M, sinon L
    }
    if (!qr) return null;
    var n = qr.getModuleCount(), m = [];
    for (var r = 0; r < n; r++) { m.push([]); for (var c = 0; c < n; c++) m[r].push(qr.isDark(r, c)); }
    return { n: n, dark: m, level: lv };
  }
  // Taille imprimée : module de 0,6 mm (≥ 0,55 mm jusqu’à 89 modules), entre 30 et 50 mm (hors marge blanche)
  var QR_MIN_MOD = 0.6, QR_MIN = 30, QR_MAX = 50;
  function qrSize(n) { return Math.max(QR_MIN, Math.min(QR_MAX, n * QR_MIN_MOD)); }
  function drawQr(doc, q, x, y, size) {
    var s = size / q.n;
    doc.setFillColor(255); doc.rect(x - 4 * s, y - 4 * s, size + 8 * s, size + 8 * s, 'F');
    doc.setFillColor(0);
    for (var r = 0; r < q.n; r++) {
      var c = 0;
      while (c < q.n) {
        if (!q.dark[r][c]) { c++; continue; }
        var c0 = c; while (c < q.n && q.dark[r][c]) c++;
        doc.rect(x + c0 * s, y + r * s, (c - c0) * s + 0.01, s + 0.01, 'F');
      }
    }
  }
  function doorLabelSize(opts, q) {
    var b = brandOf(opts);
    if (!b && !q) return null;
    var qs = q ? qrSize(q.n) : 0;
    return { w: q ? Math.max(120, qs + 90) : 110, h: Math.max(b ? 40 : 30, q ? qs + 14 : 0), qs: qs };
  }
  // Étiquette de porte : logo + coordonnées + QR vers la fiche du tableau
  function doorLabel(doc, p, opts, q, x, y, sz) {
    var b = brandOf(opts), pad = 5, W = sz.w, H = sz.h;
    doc.setDrawColor(0); doc.setLineWidth(0.2); doc.rect(x, y, W, H, 'S'); cropMarks(doc, x, y, W, H);
    var textR = q ? x + W - pad - sz.qs - 6 : x + W - pad, tx = x + pad, ty = y + pad;
    if (b) {
      var lw = drawLogo(doc, b, tx, ty, 22, 14);
      var nx = tx + (lw ? lw + 3 : 0);
      doc.setTextColor(0); doc.setFont('helvetica', 'bold');
      var nf = fitFont(doc, clean(b.name || ''), textR - nx, 13, 8);
      doc.text(nf.text, nx, ty + 5.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      var sub = clean('Électricien - installation du tableau');
      doc.text(sub, nx, ty + 10.5);
      ty += 19;
      doc.setFontSize(9);
      [b.tel ? 'Tél. ' + b.tel : '', b.mail, b.addr].filter(Boolean).forEach(function (l) {
        var t = doc.splitTextToSize(clean(l), textR - tx)[0]; doc.text(t, tx, ty); ty += 4.6;
      });
      ty += 1;
    } else {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(0);
      doc.text(clean('Tableau électrique'), tx, ty + 5); ty += 12;
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    var who = clean([p.client || p.title, fmtDate(p.date)].filter(Boolean).join('  ·  '));
    if (who) doc.text(doc.splitTextToSize(who, textR - tx)[0], tx, Math.min(ty + 1, y + H - pad - 1));
    if (q) {
      var qx = x + W - pad - sz.qs, qy = y + pad;
      drawQr(doc, q, qx, qy, sz.qs);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(60);
      doc.text(clean('Scannez : liste des circuits'), qx + sz.qs / 2, qy + sz.qs + 4.5, { align: 'center' });
      doc.setTextColor(0);
    }
  }

  function stripHeader(doc, p, page, opts) {
    var b = brandOf(opts), x = MARGIN;
    doc.setTextColor(0);
    if (b) {
      var lw = drawLogo(doc, b, MARGIN, 5.5, 16, 7.5);
      if (lw) x += lw + 2;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      var nm = fitFont(doc, clean(b.name || ''), 70, 11, 7);
      doc.text(nm.text, x, 11);
      x += doc.getTextWidth(nm.text) + 5;
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    var info = clean(['Étiquettes tableau électrique', p.client || (p.title && p.title.indexOf('Étiquettes') !== 0 ? p.title : ''), p.ref ? 'Réf. ' + p.ref : '', fmtDate(p.date)].filter(Boolean).join('  ·  '));
    info = fitFont(doc, info, A4L.w - MARGIN - 78 - x, 8.5, 6).text;
    doc.text(info, x, 11);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text('Imprimer à 100 % / taille réelle (sans ajustement)', A4L.w - MARGIN, 11, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.setTextColor(90);
    doc.text(clean('Bandes de ' + String(opts.stripH).replace('.', ',') + ' mm de haut · 1 module = 17,5 mm · Découper sur les traits · Page ' + page), MARGIN, 15.5);
    doc.setTextColor(0);
  }

  function stripFooter(doc, p, page, opts) {
    var b = brandOf(opts);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110);
    var ft = b ? clean(b.name || '') + (contactLine(b) ? '  ·  ' + contactLine(b) : '') : clean('Étiquettes tableau électrique' + (p.client ? '  ·  ' + p.client : ''));
    doc.text(fitFont(doc, ft, A4L.w - 2 * MARGIN - 20, 7, 5).text, MARGIN, A4L.h - 5);
    doc.text('Page ' + page, A4L.w - MARGIN, A4L.h - 5, { align: 'right' });
    doc.setTextColor(0);
  }
  function ruler(doc, y) {
    // Règle de contrôle : 10 modules = 175 mm
    var x = MARGIN, L = 10 * MOD;
    doc.setDrawColor(0); doc.setLineWidth(0.2);
    doc.line(x, y, x + L, y);
    for (var i = 0; i <= 10; i++) doc.line(x + i * MOD, y - (i % 5 === 0 ? 2.2 : 1.3), x + i * MOD, y);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.text('Contrôle d\'impression : ce trait doit mesurer 175 mm (10 modules de 17,5 mm)', x + L + 3, y + 0.8);
  }

  function build(p, opts) {
    opts = opts || {};
    var stripH = Math.max(8, Math.min(40, Number(opts.stripH) || 14));
    opts.stripH = stripH;
    var jsPDF = g.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: !!opts.compress });
    var bd = brandOf(opts);
    doc.setProperties({ title: clean('Étiquettes - ' + (p.client || '')), author: clean(bd ? bd.name : 'Entreprise AR'), creator: 'Entreprise AR - étiquettes' });
    var maxM = Math.floor((A4L.w - 2 * MARGIN) / MOD + 1e-9);   // 16 modules par bande
    var page = 1;
    stripHeader(doc, p, page, opts);
    ruler(doc, 22);
    var y = 30, titleH = 7, gap = 6;
    (p.rows || []).forEach(function (row, ri) {
      var lay = layout(row);
      var parts = pieces(lay, maxM);
      parts.forEach(function (pc, pi) {
        if (y + titleH + stripH + 3 > A4L.h - MARGIN - 4) {
          stripFooter(doc, p, page, opts); doc.addPage('a4', 'landscape'); page++;
          stripHeader(doc, p, page, opts);
          y = 24;
        }
        var x0 = MARGIN + 0, wTot = (pc[1] - pc[0]) * MOD, sy = y + titleH;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0);
        var title = 'Rangée ' + (ri + 1) + '  -  ' + row.modules + ' modules' + (parts.length > 1 ? '  (partie ' + (pi + 1) + '/' + parts.length + ')' : '');
        doc.text(clean(title), x0, y + 2.2);
        if (lay.used > row.modules + 1e-9) {
          doc.setTextColor(180, 0, 0);
          doc.text(clean('Attention : rangée en dépassement (' + DATA.fmtW(lay.used) + ' / ' + row.modules + ' modules)'), x0 + Math.max(wTot, 120), y + 2.2, { align: 'right' });
          doc.setTextColor(0);
        }
        // Cases vides (modules libres) : fin trait gris
        doc.setDrawColor(185); doc.setLineWidth(0.1);
        for (var m = Math.ceil(pc[0]); m < pc[1]; m++) {
          var occupied = lay.items.some(function (it) { return it.d.type !== 'vide' && it.start < m + 1 - 1e-9 && it.end > m + 1e-9; });
          if (!occupied && m > pc[0]) doc.line(x0 + (m - pc[0]) * MOD, sy, x0 + (m - pc[0]) * MOD, sy + stripH);
        }
        // Appareils : un rectangle par cellule, largeur = modules × 17,5 mm
        lay.items.forEach(function (it) {
          if (it.end <= pc[0] + 1e-9 || it.start >= pc[1] - 1e-9 || it.d.type === 'vide' || !(it.end > it.start)) return;
          var cx = x0 + (it.start - pc[0]) * MOD, cw = (it.end - it.start) * MOD;
          doc.setDrawColor(0); doc.setLineWidth(0.15);
          doc.rect(cx, sy, cw, stripH, 'S');
          drawCell(doc, cx, sy, cw, stripH, it.d);
        });
        // Contour de découpe de la bande + traits de coupe
        doc.setDrawColor(0); doc.setLineWidth(0.2);
        doc.rect(x0, sy, wTot, stripH, 'S');
        cropMarks(doc, x0, sy, wTot, stripH);
        y = sy + stripH + gap;
      });
    });
    // Étiquette de porte (logo, coordonnées, QR code de la fiche) après les bandes
    var q = opts.qrUrl ? qrMatrix(opts.qrUrl) : null;
    var dsz = doorLabelSize(opts, q);
    if (dsz) {
      if (y + 6 + dsz.h > A4L.h - MARGIN - 4) {
        stripFooter(doc, p, page, opts); doc.addPage('a4', 'landscape'); page++;
        stripHeader(doc, p, page, opts); y = 24;
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0);
      doc.text(clean('Étiquette de porte du tableau'), MARGIN, y + 2.2);
      doorLabel(doc, p, opts, q, MARGIN, y + 7, dsz);
    }
    doc.qrInfo = q ? { modules: q.n, level: q.level, sizeMm: dsz.qs, chars: opts.qrUrl.length } : null;
    stripFooter(doc, p, page, opts);
    if (opts.legend !== false) legend(doc, p, opts);
    return doc;
  }

  function legend(doc, p, opts) {
    var b = brandOf(opts);
    doc.addPage('a4', 'portrait');
    var W = A4P.w, H = A4P.h, M = 12;
    var y = 16;
    function header() {
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      if (b) {
        var lw = drawLogo(doc, b, M, y - 8, 22, 9);
        doc.text(fitFont(doc, clean(b.name || ''), 90, 16, 9).text, M + (lw ? lw + 3 : 0), y);
      } else doc.text(clean('Repérage des circuits'), M, y);
      doc.setFontSize(10.5); doc.setFont('helvetica', 'normal');
      doc.text('Tableau récapitulatif des circuits', W - M, y, { align: 'right' });
      if (b && contactLine(b)) {
        doc.setFontSize(8); doc.setTextColor(80);
        doc.text(fitFont(doc, contactLine(b), W - 2 * M, 8, 6).text, M, y + 4.5); doc.setTextColor(0); y += 4.5;
      }
      y += 4; doc.setDrawColor(47, 122, 140); doc.setLineWidth(0.6); doc.line(M, y, W - M, y);
      y += 6;
      doc.setFontSize(9);
      var cof = DATA.COFFRETS && DATA.COFFRETS[p.coffret];
      var rows = [['Client', p.client], ['Adresse', p.address], ['Réf. chantier', p.ref], ['Date', fmtDate(p.date)]];
      if (cof) rows.push(['Coffret', cof.nom + ' - ' + (p.rows || []).length + ' rangée(s)']);
      if (p.title) rows.push(['Titre', p.title]);
      rows.forEach(function (r, i) {
        var cx = M + (i % 2) * ((W - 2 * M) / 2), cy = y + Math.floor(i / 2) * 5.5;
        doc.setFont('helvetica', 'bold'); doc.text(clean(r[0] + ' :'), cx, cy);
        doc.setFont('helvetica', 'normal');
        var v = doc.splitTextToSize(clean(r[1] || '-'), (W - 2 * M) / 2 - 26)[0];
        doc.text(v, cx + 24, cy);
      });
      y += Math.ceil(rows.length / 2) * 5.5;
      if (p.note) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5);
        var nl = doc.splitTextToSize(clean('Note : ' + p.note), W - 2 * M).slice(0, 3);
        doc.text(nl, M, y); y += nl.length * 3.8 + 1;
      }
      y += 2;
    }
    var cols = [['Rangée', 14], ['N°', 9], ['Modules', 16], ['Type', 46], ['Calibre', 15], ['Circuit', 49], ['Pièce', 37]];
    function thead() {
      doc.setFillColor(47, 122, 140); doc.rect(M, y, W - 2 * M, 7, 'F');
      doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      var cx = M;
      cols.forEach(function (c) { doc.text(c[0], cx + 1.5, y + 4.7); cx += c[1]; });
      doc.setTextColor(0); y += 7;
    }
    header(); thead();
    var n = 0;
    (p.rows || []).forEach(function (row, ri) {
      var lay = layout(row), k = 0;
      lay.items.forEach(function (it) {
        var d = it.d;
        if (d.type === 'vide') return;
        k++;
        var t = DATA.TYPES[d.type] || DATA.TYPES.autre;
        var typeTxt = d.type === 'diff' ? 'Inter. diff. 30 mA type ' + (d.sub || 'A') : d.type === 'dd' ? 'Disj. diff. 30 mA type ' + (d.sub || 'A') : t.nom;
        var mod = (Math.floor(it.start) + 1) + (it.end - it.start > 1 ? '-' + Math.ceil(it.end) : '');
        var cells = [String(ri + 1), String(k), mod, typeTxt, DATA.calText(d), d.label || '', d.room || ''];
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        var wrapped = cells.map(function (c, j) { return doc.splitTextToSize(clean(c || '-'), cols[j][1] - 3); });
        var rh = Math.max(6, Math.max.apply(null, wrapped.map(function (w) { return w.length; })) * 3.4 + 2.6);
        if (y + rh > H - 14) {
          footer(); doc.addPage('a4', 'portrait'); y = 16; header(); thead();
        }
        if (n % 2 === 1) { doc.setFillColor(243, 246, 245); doc.rect(M, y, W - 2 * M, rh, 'F'); }
        var cx = M;
        wrapped.forEach(function (w, j) { doc.text(w, cx + 1.5, y + 4.2); cx += cols[j][1]; });
        doc.setDrawColor(215); doc.setLineWidth(0.1); doc.line(M, y + rh, W - M, y + rh);
        y += rh; n++;
      });
    });
    if (!n) { doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.text('Aucun appareil saisi.', M + 2, y + 6); }
    footer();
    function footer() {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110);
      doc.text(fitFont(doc, clean((b ? (b.name || '') + '  ·  ' + (contactLine(b) ? contactLine(b) + '  ·  ' : '') : '') + 'Repérage des circuits établi le ' + fmtDate(new Date().toISOString().slice(0, 10))), W - 2 * M, 7, 5).text, M, H - 8);
      doc.setTextColor(0);
    }
  }

  g.EAR_PDF = { clean: clean, qrMatrix: qrMatrix, qrSize: qrSize, build: build, fileName: fileName, layout: layout, pieces: pieces, MOD: MOD, fmtDate: fmtDate, slug: slug };
})(window);
