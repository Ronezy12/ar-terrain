/* Pictogrammes au trait (grille 24×24), rendus en SVG (écran) et en tracés vectoriels (PDF). */
(function (g) {
  'use strict';
  // Primitives : ['L',x1,y1,x2,y2] ligne · ['C',cx,cy,r] cercle · ['D',cx,cy,r] disque plein
  //              ['R',x,y,w,h,rx] rectangle · ['P',[x,y,...],ferme] polyligne
  var ICONS = {
    lumiere: { nom: 'Éclairage', p: [['C', 12, 9.5, 5.5], ['L', 9.6, 14.6, 9.6, 17.5], ['L', 14.4, 14.6, 14.4, 17.5], ['L', 9.6, 17.5, 14.4, 17.5], ['L', 10.4, 20, 13.6, 20]] },
    prise: { nom: 'Prise', p: [['C', 12, 12, 8.5], ['D', 8.7, 12.5, 1.3], ['D', 15.3, 12.5, 1.3], ['L', 12, 3.5, 12, 6.5]] },
    four: { nom: 'Four', p: [['R', 3.5, 3.5, 17, 17, 1.5], ['L', 3.5, 8, 20.5, 8], ['R', 7, 11, 10, 6.5, 1], ['D', 7.5, 5.8, 0.9], ['D', 11, 5.8, 0.9]] },
    plaque: { nom: 'Plaque de cuisson', p: [['R', 2.5, 5, 19, 14, 1.5], ['C', 8.2, 12, 3.2], ['C', 16, 12, 2.4], ['D', 8.2, 12, 0.8]] },
    lavelinge: { nom: 'Lave-linge', p: [['R', 4.5, 2.5, 15, 19, 1.5], ['L', 4.5, 7, 19.5, 7], ['C', 12, 14, 4.6], ['D', 7.5, 4.8, 0.8], ['D', 10.2, 4.8, 0.8]] },
    lavevaisselle: { nom: 'Lave-vaisselle', p: [['R', 4.5, 2.5, 15, 19, 1.5], ['L', 4.5, 7, 19.5, 7], ['L', 8, 11, 16, 11], ['L', 8, 14.5, 16, 14.5], ['L', 8, 18, 16, 18], ['D', 16.5, 4.8, 0.8]] },
    chauffeeau: { nom: 'Chauffe-eau', p: [['R', 6.5, 2.5, 11, 19, 4], ['P', [12, 8, 14.6, 12.2, 14.6, 13.8, 13.2, 15.6, 10.8, 15.6, 9.4, 13.8, 9.4, 12.2], true]] },
    radiateur: { nom: 'Radiateur', p: [['R', 3, 5.5, 18, 12.5, 1.5], ['L', 7.5, 5.5, 7.5, 18], ['L', 12, 5.5, 12, 18], ['L', 16.5, 5.5, 16.5, 18], ['L', 5, 18, 5, 20.5], ['L', 19, 18, 19, 20.5]] },
    vmc: { nom: 'VMC / ventilation', p: [['C', 12, 12, 8.8], ['C', 12, 12, 1.6], ['P', [12, 10.4, 10.2, 5.6, 13.8, 4.4], true], ['P', [13.4, 12.8, 18.6, 13.8, 16.8, 17.1], true], ['P', [10.6, 12.8, 7.2, 16.8, 5.4, 13.6], true]] },
    volet: { nom: 'Volets roulants', p: [['R', 4, 2.5, 16, 19, 1], ['L', 4, 6.5, 20, 6.5], ['L', 4, 10, 20, 10], ['L', 4, 13.5, 20, 13.5], ['L', 4, 17, 20, 17]] },
    ve: { nom: 'Véhicule électrique', p: [['P', [2.5, 16, 2.5, 12, 5.5, 11.5, 8, 7, 16, 7, 18.5, 11.5, 21.5, 12, 21.5, 16], true], ['C', 7, 16.5, 2], ['C', 17, 16.5, 2], ['P', [12.8, 8.3, 10.7, 11.3, 12.6, 11.3, 11.2, 14.4], false]] },
    frigo: { nom: 'Réfrigérateur / congélateur', p: [['R', 6, 2, 12, 20, 1.5], ['L', 6, 9, 18, 9], ['L', 9, 4.5, 9, 7], ['L', 9, 11.5, 9, 14.5]] },
    ecran: { nom: 'Informatique / TV', p: [['R', 3, 4.5, 18, 12, 1.2], ['L', 12, 16.5, 12, 19.5], ['L', 8.5, 19.5, 15.5, 19.5]] },
    exterieur: { nom: 'Extérieur / jardin', p: [['L', 12, 21, 12, 9], ['P', [8, 9, 16, 9, 14.5, 4, 9.5, 4], true], ['L', 8.5, 21, 15.5, 21]] },
    diff: { nom: 'Différentiel', p: [['P', [8.5, 3, 3.5, 12.5, 7.5, 12.5, 6, 21, 11.5, 10.5, 7.5, 10.5], true], ['C', 17, 5, 2.2], ['L', 17, 7.5, 17, 15], ['L', 13.8, 10, 20.2, 10], ['L', 17, 15, 14.5, 21], ['L', 17, 15, 19.5, 21]] },
    disj: { nom: 'Disjoncteur', p: [['L', 12, 2.5, 12, 7], ['L', 12, 7, 17, 14.5], ['L', 12, 16, 12, 21.5], ['L', 9.5, 9.5, 14.5, 4.5], ['L', 9.5, 4.5, 14.5, 9.5]] },
    sect: { nom: 'Sectionneur', p: [['L', 12, 2.5, 12, 7], ['L', 12, 7, 17, 14.5], ['L', 12, 16, 12, 21.5], ['L', 9, 7, 15, 7]] },
    contact: { nom: 'Contacteur / télérupteur', p: [['R', 4, 4, 16, 16, 1.5], ['L', 8, 9, 16, 9], ['L', 8, 15, 16, 15], ['L', 12, 9, 12, 15]] },
    minuterie: { nom: 'Minuterie', p: [['C', 12, 13, 8], ['L', 12, 13, 12, 8.5], ['L', 12, 13, 15.5, 15], ['L', 10, 2.5, 14, 2.5]] },
    bornier: { nom: 'Bornier', p: [['R', 3, 8, 18, 8, 1], ['C', 7, 12, 1.6], ['C', 12, 12, 1.6], ['C', 17, 12, 1.6]] },
    eclair: { nom: 'Général / alimentation', p: [['P', [13.5, 2, 5.5, 13.5, 11.5, 13.5, 10, 22, 18.5, 10, 12.5, 10], true]] }
  };

  function svg(name, cls) {
    var ic = ICONS[name];
    if (!ic) return '';
    var out = '';
    ic.p.forEach(function (s) {
      switch (s[0]) {
        case 'L': out += '<line x1="' + s[1] + '" y1="' + s[2] + '" x2="' + s[3] + '" y2="' + s[4] + '"/>'; break;
        case 'C': out += '<circle cx="' + s[1] + '" cy="' + s[2] + '" r="' + s[3] + '"/>'; break;
        case 'D': out += '<circle cx="' + s[1] + '" cy="' + s[2] + '" r="' + s[3] + '" fill="currentColor" stroke="none"/>'; break;
        case 'R': out += '<rect x="' + s[1] + '" y="' + s[2] + '" width="' + s[3] + '" height="' + s[4] + '" rx="' + (s[5] || 0) + '"/>'; break;
        case 'P': out += '<' + (s[2] ? 'polygon' : 'polyline') + ' points="' + s[1].join(' ') + '"/>'; break;
      }
    });
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + out + '</svg>';
  }

  // Dessin dans jsPDF : (x,y) coin haut-gauche en mm, size = côté en mm
  function pdf(doc, name, x, y, size) {
    var ic = ICONS[name];
    if (!ic) return;
    var k = size / 24;
    doc.setLineWidth(Math.max(0.12, 1.5 * k));
    doc.setLineCap('round');
    doc.setLineJoin('round');
    ic.p.forEach(function (s) {
      switch (s[0]) {
        case 'L': doc.line(x + s[1] * k, y + s[2] * k, x + s[3] * k, y + s[4] * k); break;
        case 'C': doc.circle(x + s[1] * k, y + s[2] * k, s[3] * k, 'S'); break;
        case 'D': doc.circle(x + s[1] * k, y + s[2] * k, s[3] * k, 'F'); break;
        case 'R':
          if (s[5]) doc.roundedRect(x + s[1] * k, y + s[2] * k, s[3] * k, s[4] * k, s[5] * k, s[5] * k, 'S');
          else doc.rect(x + s[1] * k, y + s[2] * k, s[3] * k, s[4] * k, 'S');
          break;
        case 'P': {
          var pts = s[1], segs = [];
          for (var i = 2; i < pts.length; i += 2) segs.push([(pts[i] - pts[i - 2]) * k, (pts[i + 1] - pts[i - 1]) * k]);
          doc.lines(segs, x + pts[0] * k, y + pts[1] * k, [1, 1], 'S', !!s[2]);
          break;
        }
      }
    });
    doc.setLineCap('butt');
    doc.setLineJoin('miter');
  }

  g.EAR_ICONS = { list: ICONS, svg: svg, pdf: pdf };
})(window);
