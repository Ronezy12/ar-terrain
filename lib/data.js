/* Données métier : types d'appareils, suggestions, modèles de départ. */
(function (g) {
  'use strict';
  var TYPES = {
    diff:  { court: 'Inter diff', ico: 'diff', nom: 'Interrupteur différentiel 30 mA', abbr: 'ID', w: 2, cal: 40, sub: true },
    disj:  { court: 'Disjoncteur', ico: 'disj', nom: 'Disjoncteur divisionnaire', abbr: 'DJ', w: 1, cal: 16 },
    agcp:  { court: 'AGCP', ico: 'eclair', nom: 'Disjoncteur de branchement / AGCP', abbr: 'AGCP', w: 4, cal: 45 },
    sect:  { court: 'Sectionneur', ico: 'sect', nom: 'Interrupteur sectionneur', abbr: 'IS', w: 2, cal: 40 },
    dd:    { court: 'Disj. diff', ico: 'diff', nom: 'Disjoncteur différentiel 30 mA', abbr: 'DD', w: 1, cal: 20, sub: true },
    jn:    { court: 'Contacteur J/N', ico: 'contact', nom: 'Contacteur jour/nuit', abbr: 'CT J/N', w: 1, cal: 20 },
    tlr:   { court: 'Télérupteur', ico: 'contact', nom: 'Télérupteur', abbr: 'TL', w: 1, cal: 16 },
    pf:    { court: 'Parafoudre', ico: 'eclair', nom: 'Parafoudre', abbr: 'PF', w: 2, cal: '' },
    min:   { court: 'Minuterie', ico: 'minuterie', nom: 'Minuterie', abbr: 'MIN', w: 1, cal: 16 },
    prise: { court: 'Prise modulaire', ico: 'prise', nom: 'Prise modulaire', abbr: 'PC', w: 2.5, cal: 16 },
    born:  { court: 'Bornier', ico: 'bornier', nom: 'Bornier / répartiteur', abbr: 'BORN', w: 2, cal: '' },
    autre: { court: 'Autre', ico: '', nom: 'Autre', abbr: '', w: 1, cal: '' },
    vide:  { court: 'Vide', ico: '', nom: 'Emplacement laissé vide', abbr: '', w: 1, cal: '' }
  };
  var TYPE_ORDER = ['disj', 'diff', 'dd', 'agcp', 'sect', 'jn', 'tlr', 'pf', 'min', 'prise', 'born', 'autre'];
  var DIFF_SUBS = ['AC', 'A', 'F'];
  var CALIBRES = [2, 3, 6, 10, 16, 20, 25, 32, 40, 45, 50, 60, 63];
  var WIDTHS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

  // [libellé, pictogramme, calibre conseillé (point de départ)]
  var SUGGESTIONS = [
    ['Éclairage salon', 'lumiere', 16], ['Éclairage chambres', 'lumiere', 16], ['Éclairage cuisine', 'lumiere', 16],
    ['Éclairage salle de bain', 'lumiere', 16], ['Éclairage extérieur', 'lumiere', 16],
    ['Prises salon', 'prise', 20], ['Prises chambre', 'prise', 20], ['Prises cuisine', 'prise', 20],
    ['Prises plan de travail', 'prise', 20], ['Prises salle de bain', 'prise', 20], ['Prises extérieures', 'prise', 20],
    ['Plaque de cuisson', 'plaque', 32], ['Four', 'four', 20], ['Lave-linge', 'lavelinge', 20],
    ['Lave-vaisselle', 'lavevaisselle', 20], ['Sèche-linge', 'lavelinge', 20], ['Réfrigérateur', 'frigo', 20],
    ['Congélateur', 'frigo', 20], ['Chauffe-eau', 'chauffeeau', 20], ['Radiateurs séjour', 'radiateur', 20],
    ['Radiateurs chambre', 'radiateur', 20], ['Sèche-serviettes', 'radiateur', 20], ['VMC', 'vmc', 2],
    ['Volets roulants', 'volet', 16], ['Borne de recharge VE', 've', 32], ['Baie informatique / TV', 'ecran', 16],
    ['Portail / jardin', 'exterieur', 16]
  ];
  var ROOMS = ['Séjour', 'Cuisine', 'Chambre 1', 'Chambre 2', 'Chambre 3', 'Salle de bain', 'WC', 'Entrée', 'Couloir',
    'Bureau', 'Buanderie', 'Garage', 'Cave', 'Extérieur', 'Combles', 'Parties communes'];

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function device(type, cal, label, icon, room, sub) {
    var t = TYPES[type];
    return { id: uid(), type: type, sub: t.sub ? (sub || 'A') : '', cal: cal === undefined ? t.cal : cal,
      w: t.w, label: label || '', icon: icon || '', room: room || '' };
  }
  function row(devs, modules) { return { id: uid(), modules: modules || 13, devices: devs }; }

  var D = device;
  var TEMPLATES = {
    vide: { nom: 'Aucun modèle (rangées vides)', desc: 'Rangées vides selon le coffret choisi à l\'étape suivante', build: function () { return [row([])]; } },
    t1: { nom: 'Studio / T1', desc: '2 rangées · ~15 circuits', build: function () {
      return [
        row([D('diff', 40, 'Diff. éclairage / prises', '', '', 'AC'), D('disj', 16, 'Éclairage séjour', 'lumiere', 'Séjour'),
          D('disj', 16, 'Éclairage cuisine / SdB', 'lumiere'), D('disj', 20, 'Prises séjour', 'prise', 'Séjour'),
          D('disj', 20, 'Prises entrée / chambre', 'prise'), D('disj', 20, 'Prises cuisine', 'prise', 'Cuisine'),
          D('disj', 2, 'VMC', 'vmc'), D('disj', 20, 'Radiateurs séjour', 'radiateur', 'Séjour'),
          D('disj', 20, 'Sèche-serviettes', 'radiateur', 'Salle de bain'), D('disj', 20, 'Chauffe-eau', 'chauffeeau'),
          D('jn', 20, 'Chauffe-eau (heures creuses)', 'chauffeeau')]),
        row([D('diff', 40, 'Diff. cuisine / lavage', '', '', 'A'), D('disj', 32, 'Plaque de cuisson', 'plaque', 'Cuisine'),
          D('disj', 20, 'Four', 'four', 'Cuisine'), D('disj', 20, 'Lave-linge', 'lavelinge'),
          D('disj', 20, 'Lave-vaisselle', 'lavevaisselle', 'Cuisine'), D('disj', 20, 'Réfrigérateur', 'frigo', 'Cuisine')])
      ]; } },
    t2: { nom: 'T2 appartement', desc: '2 rangées · ~18 circuits', build: function () {
      return [
        row([D('diff', 40, 'Diff. éclairage / prises', '', '', 'AC'), D('disj', 16, 'Éclairage séjour / entrée', 'lumiere', 'Séjour'),
          D('disj', 16, 'Éclairage chambre / SdB', 'lumiere'), D('disj', 20, 'Prises séjour', 'prise', 'Séjour'),
          D('disj', 20, 'Prises chambre', 'prise', 'Chambre 1'), D('disj', 20, 'Prises entrée / SdB', 'prise'),
          D('disj', 16, 'Volets roulants', 'volet'), D('disj', 2, 'VMC', 'vmc'),
          D('disj', 20, 'Radiateurs séjour', 'radiateur', 'Séjour'), D('disj', 20, 'Radiateurs chambre', 'radiateur', 'Chambre 1')]),
        row([D('diff', 40, 'Diff. cuisine / lavage', '', '', 'A'), D('disj', 32, 'Plaque de cuisson', 'plaque', 'Cuisine'),
          D('disj', 20, 'Four', 'four', 'Cuisine'), D('disj', 20, 'Lave-linge', 'lavelinge'),
          D('disj', 20, 'Lave-vaisselle', 'lavevaisselle', 'Cuisine'), D('disj', 20, 'Prises cuisine', 'prise', 'Cuisine'),
          D('diff', 40, 'Diff. chauffe-eau', '', '', 'AC'), D('disj', 20, 'Chauffe-eau', 'chauffeeau'),
          D('jn', 20, 'Chauffe-eau (heures creuses)', 'chauffeeau')])
      ]; } },
    t3: { nom: 'T3 / T4 appartement', desc: '3 rangées · ~25 circuits', build: function () {
      return [
        row([D('diff', 40, 'Diff. éclairage / prises', '', '', 'AC'), D('disj', 16, 'Éclairage séjour', 'lumiere', 'Séjour'),
          D('disj', 16, 'Éclairage cuisine / entrée', 'lumiere'), D('disj', 16, 'Éclairage chambres', 'lumiere'),
          D('disj', 20, 'Prises séjour', 'prise', 'Séjour'), D('disj', 20, 'Prises séjour 2', 'prise', 'Séjour'),
          D('disj', 20, 'Prises entrée / couloir', 'prise', 'Entrée'), D('disj', 2, 'VMC', 'vmc'),
          D('disj', 16, 'Volets roulants', 'volet')]),
        row([D('diff', 40, 'Diff. chambres / chauffage', '', '', 'AC'), D('disj', 20, 'Prises chambre 1', 'prise', 'Chambre 1'),
          D('disj', 20, 'Prises chambre 2', 'prise', 'Chambre 2'), D('disj', 20, 'Prises chambre 3', 'prise', 'Chambre 3'),
          D('disj', 20, 'Prises salle de bain', 'prise', 'Salle de bain'), D('disj', 20, 'Radiateurs séjour', 'radiateur', 'Séjour'),
          D('disj', 20, 'Radiateurs chambres', 'radiateur'), D('disj', 20, 'Sèche-serviettes', 'radiateur', 'Salle de bain'),
          D('disj', 20, 'Chauffe-eau', 'chauffeeau'), D('jn', 20, 'Chauffe-eau (heures creuses)', 'chauffeeau')]),
        row([D('diff', 40, 'Diff. cuisine / lavage', '', '', 'A'), D('disj', 32, 'Plaque de cuisson', 'plaque', 'Cuisine'),
          D('disj', 20, 'Four', 'four', 'Cuisine'), D('disj', 20, 'Lave-linge', 'lavelinge', 'Buanderie'),
          D('disj', 20, 'Lave-vaisselle', 'lavevaisselle', 'Cuisine'), D('disj', 20, 'Sèche-linge', 'lavelinge', 'Buanderie'),
          D('disj', 20, 'Prises cuisine', 'prise', 'Cuisine'), D('disj', 20, 'Prises plan de travail', 'prise', 'Cuisine'),
          D('disj', 20, 'Réfrigérateur', 'frigo', 'Cuisine')])
      ]; } },
    maison: { nom: 'Maison', desc: '4 rangées · ~32 circuits, extérieur et VE', build: function () {
      return [
        row([D('diff', 63, 'Diff. éclairage / prises', '', '', 'AC'), D('disj', 16, 'Éclairage RDC', 'lumiere'),
          D('disj', 16, 'Éclairage étage', 'lumiere'), D('disj', 16, 'Éclairage extérieur', 'lumiere', 'Extérieur'),
          D('disj', 20, 'Prises séjour', 'prise', 'Séjour'), D('disj', 20, 'Prises séjour 2', 'prise', 'Séjour'),
          D('disj', 20, 'Prises entrée', 'prise', 'Entrée'), D('disj', 16, 'Volets roulants RDC', 'volet'),
          D('disj', 16, 'Volets roulants étage', 'volet'), D('disj', 2, 'VMC', 'vmc')]),
        row([D('diff', 40, 'Diff. chambres / chauffage', '', '', 'AC'), D('disj', 20, 'Prises chambre 1', 'prise', 'Chambre 1'),
          D('disj', 20, 'Prises chambre 2', 'prise', 'Chambre 2'), D('disj', 20, 'Prises chambre 3', 'prise', 'Chambre 3'),
          D('disj', 20, 'Prises salle de bain', 'prise', 'Salle de bain'), D('disj', 20, 'Prises bureau', 'ecran', 'Bureau'),
          D('disj', 20, 'Radiateurs RDC', 'radiateur'), D('disj', 20, 'Radiateurs étage', 'radiateur'),
          D('disj', 20, 'Sèche-serviettes', 'radiateur', 'Salle de bain')]),
        row([D('diff', 40, 'Diff. cuisine / lavage', '', '', 'A'), D('disj', 32, 'Plaque de cuisson', 'plaque', 'Cuisine'),
          D('disj', 20, 'Four', 'four', 'Cuisine'), D('disj', 20, 'Lave-linge', 'lavelinge', 'Buanderie'),
          D('disj', 20, 'Lave-vaisselle', 'lavevaisselle', 'Cuisine'), D('disj', 20, 'Sèche-linge', 'lavelinge', 'Buanderie'),
          D('disj', 20, 'Prises cuisine', 'prise', 'Cuisine'), D('disj', 20, 'Prises plan de travail', 'prise', 'Cuisine'),
          D('disj', 20, 'Congélateur', 'frigo', 'Garage')]),
        row([D('diff', 40, 'Diff. VE / extérieur', '', '', 'A'), D('disj', 32, 'Borne de recharge VE', 've', 'Garage'),
          D('disj', 20, 'Prises extérieures', 'prise', 'Extérieur'), D('disj', 16, 'Portail / jardin', 'exterieur', 'Extérieur'),
          D('disj', 20, 'Chauffe-eau', 'chauffeeau'), D('jn', 20, 'Chauffe-eau (heures creuses)', 'chauffeeau'),
          D('pf', '', 'Parafoudre', 'eclair')])
      ]; } }
  };
  var TEMPLATE_ORDER = ['t1', 't2', 't3', 'maison', 'vide'];


  /* Coffrets : illustrations SVG originales (aucune photo ni nom de fabricant) */
  function rowsSvg(x, y, w, n, gap, h, strip, rail) {
    var o = '';
    for (var i = 0; i < n; i++) {
      var yy = y + i * (h + gap);
      o += '<rect x="' + x + '" y="' + yy + '" width="' + w + '" height="' + (h * 0.3) + '" rx="1" fill="' + strip + '"/>' +
        '<rect x="' + x + '" y="' + (yy + h * 0.34) + '" width="' + w + '" height="' + (h * 0.66) + '" rx="1" fill="' + rail + '"/>';
      for (var k = 1; k < 8; k++) o += '<line x1="' + (x + k * w / 8) + '" y1="' + (yy + h * 0.38) + '" x2="' + (x + k * w / 8) + '" y2="' + (yy + h * 0.96) + '" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>';
    }
    return o;
  }
  function modRow(x, y, w, h, n, fill, gapc) {
    var o = '', mw = w / n;
    for (var k = 0; k < n; k++) o += '<rect x="' + (x + k * mw + 0.35) + '" y="' + y + '" width="' + (mw - 0.7) + '" height="' + h + '" rx="0.6" fill="' + fill + '"/>';
    return o;
  }
  var DRIVIA = (function () {
    var o = '<svg viewBox="0 0 80 130" aria-hidden="true"><rect x="10" y="3" width="60" height="124" rx="3.5" fill="#FBFCFC" stroke="#D3D8DA" stroke-width="1"/>' +
      '<rect x="13" y="6" width="54" height="118" rx="2" fill="#F1F3F4"/>';
    for (var i = 0; i < 4; i++) {
      var y = 11 + i * 27.5;
      o += '<rect x="14.5" y="' + y + '" width="51" height="6" rx="1" fill="#BCD8E6"/><rect x="14.5" y="' + y + '" width="51" height="1.6" fill="#DDECF3"/>' +
        '<rect x="14.5" y="' + (y + 7) + '" width="51" height="15" fill="#E3E6E7"/>' + modRow(15.5, y + 9, 49, 11, 9, '#9AA2A6') +
        '<rect x="14.5" y="' + (y + 22.4) + '" width="51" height="1.4" fill="#C7CDD0"/>';
    }
    return o + '<rect x="36" y="121.5" width="8" height="1.4" rx=".7" fill="#C9CFD2"/></svg>';
  })();
  var XL3 = (function () {
    var o = '<svg viewBox="0 0 80 130" aria-hidden="true"><rect x="10" y="2" width="60" height="126" rx="2" fill="#F7F8F8" stroke="#AEB5B9" stroke-width="1.1"/>' +
      '<rect x="13.5" y="5.5" width="53" height="119" fill="#FFFFFF" stroke="#C3C9CC" stroke-width=".8"/>' +
      '<rect x="15" y="7" width="3.2" height="116" fill="#D5DADC"/><rect x="61.8" y="7" width="3.2" height="116" fill="#D5DADC"/>';
    for (var i = 0; i < 4; i++) {
      var y = 11 + i * 28.5;
      o += '<rect x="19" y="' + y + '" width="42" height="4.5" fill="#E4E8EA" stroke="#C6CCCF" stroke-width=".5"/>' +
        '<rect x="19" y="' + (y + 6) + '" width="42" height="17" fill="#EDEFF0"/>' + modRow(19.5, y + 8, 41, 13, 8, '#8F989D') +
        '<rect x="19" y="' + (y + 23.5) + '" width="42" height="1.2" fill="#B9C0C3"/>';
    }
    [[16.6, 9], [63.4, 9], [16.6, 121], [63.4, 121]].forEach(function (c) { o += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="1" fill="#9EA6AA"/>'; });
    return o + '</svg>';
  })();
  var PLEXO = (function () {
    var o = '<svg viewBox="0 0 80 130" aria-hidden="true"><rect x="9" y="2" width="60" height="126" rx="4" fill="#6B7378"/>' +
      '<rect x="12" y="5" width="54" height="120" rx="2.5" fill="#4A5257"/>';
    [9, 67].forEach(function (b0) {
      for (var i = 0; i < 2; i++) {
        var y = b0 + i * 26;
        o += '<rect x="15" y="' + y + '" width="48" height="5" fill="#8A9398"/>' + '<rect x="15" y="' + (y + 6) + '" width="48" height="16" fill="#353C40"/>' +
          modRow(15.5, y + 8, 47, 12, 8, '#23292C');
      }
    });
    o += '<rect x="12" y="5" width="54" height="120" rx="2.5" fill="#1F262A" fill-opacity=".38"/>' +
      '<rect x="12" y="63" width="54" height="2.2" fill="#6B7378"/>' +
      '<path d="M16 8 L30 8 L18 50 L16 50 Z" fill="#fff" fill-opacity=".10"/><path d="M16 68 L28 68 L18 105 L16 105 Z" fill="#fff" fill-opacity=".08"/>' +
      '<rect x="66" y="22" width="5.5" height="17" rx="1.6" fill="#15191B"/><rect x="66" y="88" width="5.5" height="17" rx="1.6" fill="#15191B"/>' +
      '<rect x="7" y="24" width="2.5" height="11" rx="1" fill="#2A3034"/><rect x="7" y="92" width="2.5" height="11" rx="1" fill="#2A3034"/></svg>';
    return o;
  })();
  var OTHER = '<svg viewBox="0 0 80 130" aria-hidden="true"><rect x="11" y="5" width="60" height="121" rx="4" fill="#E9ECED"/>' +
    '<rect x="9" y="3" width="60" height="121" rx="4" fill="#F7F8F8" stroke="#A9B0B3" stroke-width="1.1" stroke-dasharray="4 2.6"/>' +
    '<rect x="64" y="6" width="4" height="115" rx="2" fill="#E6E9EA"/></svg>';
  var COFFRETS = {
    drivia: { nom: 'Drivia', modules: 13, rangees: 3, chips: [13, 18], svg: DRIVIA },
    xl3: { nom: 'XL3 125', modules: 18, rangees: 4, chips: [18], svg: XL3 },
    plexo: { nom: 'Plexo', modules: 8, rangees: 1, chips: [2, 4, 6, 8, 12, 18], svg: PLEXO },
    other: { nom: 'Other', modules: 12, rangees: 3, chips: [12, 13, 18, 24, 36], svg: OTHER },
    // anciens identifiants (projets déjà enregistrés)
    standard: { nom: 'Coffret standard', modules: 13, rangees: 4, svg: DRIVIA, legacy: true },
    grande: { nom: 'Tableau grande capacité', modules: 18, rangees: 4, svg: XL3, legacy: true },
    etanche: { nom: 'Coffret étanche', modules: 8, rangees: 1, svg: PLEXO, legacy: true }
  };
  var COFFRET_ORDER = ['drivia', 'xl3', 'plexo', 'other'];
  var MODULE_CHOICES = [2, 4, 6, 8, 12, 18];

  function typeAbbr(d) {
    var t = TYPES[d.type] || TYPES.autre;
    if (d.type === 'diff') return 'ID 30mA ' + (d.sub || 'A');
    if (d.type === 'dd') return 'DD 30mA ' + (d.sub || 'A');
    return t.abbr;
  }
  function calText(d) {
    if (d.cal === '' || d.cal === null || d.cal === undefined) return '';
    return String(d.cal).replace('.', ',') + ' A';
  }
  function fmtW(w) { return String(w).replace('.', ','); }

  g.EAR_DATA = { TYPES: TYPES, TYPE_ORDER: TYPE_ORDER, DIFF_SUBS: DIFF_SUBS, CALIBRES: CALIBRES, WIDTHS: WIDTHS,
    SUGGESTIONS: SUGGESTIONS, ROOMS: ROOMS, TEMPLATES: TEMPLATES, TEMPLATE_ORDER: TEMPLATE_ORDER,
    COFFRETS: COFFRETS, COFFRET_ORDER: COFFRET_ORDER, MODULE_CHOICES: MODULE_CHOICES,
    uid: uid, device: device, row: row, typeAbbr: typeAbbr, calText: calText, fmtW: fmtW };
})(window);
