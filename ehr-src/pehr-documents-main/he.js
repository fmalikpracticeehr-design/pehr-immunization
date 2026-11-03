/* Health Education AI — Setup ▸ Clinical ▸ Health Education, visit Plan section, patient view.
   Self-contained module (needs he-data.js). Hooks into the prototype via window.__pehrShowView,
   window.__pehrShowPatientSub, window.__pehrOVDebug and window.toast. State lives in localStorage. */
(function () {
  'use strict';
  var D = window.HE_DATA;
  if (!D) { console.warn('he-data.js missing'); return; }

  /* ───────────────────────── helpers ───────────────────────── */
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function toast(msg, o) { try { if (typeof window.toast === 'function') window.toast(msg, o || {}); } catch (e) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return (p || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function mdy(d) { d = d || new Date(); return ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2) + '/' + d.getFullYear(); }
  function ms(name, extra) { return '<span class="ms' + (extra ? ' ' + extra : '') + '">' + name + '</span>'; }
  function debounce(fn, t) { var h; return function () { var a = arguments, s = this; clearTimeout(h); h = setTimeout(function () { fn.apply(s, a); }, t); }; }

  var USER = { name: 'ALBERTS, JOHN, MD', short: 'Dr. John Alberts', entered: 'FAMILYMEDICINE' };
  var PATIENT = {
    name: 'Robert Williams', first: 'Robert', age: 45, sex: 'Male', dob: '05/15/1980',
    language: 'English', level: 'Grade 8',
    allergies: [{ name: 'Penicillin', note: 'Severe – anaphylaxis' }, { name: 'Shellfish', note: 'Moderate – hives' }],
    meds: ['Metformin HCl 500 mg twice daily', 'Lisinopril 10 mg once daily', 'Atorvastatin 20 mg at bedtime'],
    vitals: { date: '05/01/2025', bp: '118/75', hr: 100, spo2: 98, temp: '98.6°F', weight: '185 lbs', bmi: 25.8, smoker: 'Never smoker' }
  };
  var LANGS = [['en', 'English', 'en-US'], ['es', 'Español (Spanish)', 'es-ES'], ['ur', 'اردو (Urdu)', 'ur-PK'], ['ar', 'العربية (Arabic)', 'ar-SA'], ['hi', 'हिन्दी (Hindi)', 'hi-IN'], ['fr', 'Français (French)', 'fr-FR'], ['zh', '中文 (Chinese)', 'zh-CN']];
  var LANG_NAME = {}; LANGS.forEach(function (l) { LANG_NAME[l[0]] = l[1].split(' (')[0]; });
  function langCode(name) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i][1].indexOf(name) === 0 || LANGS[i][0] === name) return LANGS[i][0]; return 'en'; }

  var SECTIONS = [
    { key: 'overview', label: 'Overview', icon: 'info' },
    { key: 'causes', label: 'Causes & triggers', icon: 'psychology_alt' },
    { key: 'treatment', label: 'Treatment & self-care', icon: 'healing' },
    { key: 'actionPlan', label: 'My action plan', icon: 'traffic' },
    { key: 'warningSigns', label: 'Warning signs: when to call', icon: 'emergency' },
    { key: 'faqs', label: 'Common questions', icon: 'help' },
    { key: 'takeaways', label: 'Key takeaways', icon: 'task_alt' }
  ];

  /* ───────────────────────── store ───────────────────────── */
  var KEY_ITEMS = 'pehr-he-items-v1', KEY_ORDERS = 'pehr-he-orders-v1', KEY_MSGS = 'pehr-he-messages-v1';
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('Browser storage is full; changes could not be saved.', { kind: 'error' }); } }

  function seedItems() {
    var out = [];
    D.SEED.forEach(function (r, i) {
      var it = {
        id: 'he' + (i + 1), name: r[0], specialty: r[1], sortOrder: '', docType: '', codeType: '', code: '', codeDesc: '', active: true,
        comments: '', enteredBy: USER.entered, entryDate: r[2], docs: [], ai: null
      };
      if (r[4]) { var c = codeInfo(r[4]); if (c) { it.codeType = c.type; it.code = c.code; it.codeDesc = c.desc; } }
      if (r[5] === 'link') it.docs.push({ id: 'd1', name: 'http://www.nlm.nih.gov/medlineplus/pancreatitis.html', type: 'HYPERLINK', url: 'https://medlineplus.gov/pancreatitis.html', entryDate: r[2], enteredBy: USER.entered });
      if (r[3] && D.CONTENT[r[3]]) {
        it.ai = { status: 'approved', level: 'Grade 8', lang: 'English', source: 'seed', model: 'Pre-generated (demo)', generatedAt: r[2], content: clone(D.CONTENT[r[3]]), translations: {}, reviewedBy: USER.name, reviewedAt: '10/27/2026' };
        if (r[3] === 'asthma') it.ai.translations.es = clone(D.CONTENT.asthma_es);
      }
      out.push(it);
    });
    return out;
  }
  function codeInfo(code) { for (var i = 0; i < D.CODES.length; i++) if (D.CODES[i].code === code) return D.CODES[i]; return null; }
  var store = { items: lsGet(KEY_ITEMS, null), orders: lsGet(KEY_ORDERS, []) };
  if (!Array.isArray(store.items) || !store.items.length) { store.items = seedItems(); lsSet(KEY_ITEMS, store.items); }
  function saveItems() { lsSet(KEY_ITEMS, store.items); }
  function saveOrders() { lsSet(KEY_ORDERS, store.orders); }
  function itemById(id) { for (var i = 0; i < store.items.length; i++) if (store.items[i].id === id) return store.items[i]; return null; }
  window.__heResetDemo = function () { localStorage.removeItem(KEY_ITEMS); localStorage.removeItem(KEY_ORDERS); localStorage.removeItem(KEY_MSGS); location.reload(); };

  /* ───────────────────────── AI layer ─────────────────────────
     Order: /api/health-education (own guarded proxy)  →  /api/ai (existing proxy)  →  simulated generator.
     The key never reaches the browser; GEMINI_API_KEY is read server-side. */
  var AI = { live: null, lastError: '', model: 'Gemini', calls: 0 };
  function postJSON(url, body, ms) {
    var ctrl = new AbortController(); var t = setTimeout(function () { ctrl.abort(); }, ms || 60000);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(url + ' → HTTP ' + r.status); return r.json(); })
      .catch(function (e) { clearTimeout(t); throw e; });
  }
  function llm(messages, opts) {
    opts = opts || {};
    var model = (window.__pehrAI && window.__pehrAI.model) || 'gemini-3.5-flash-lite';
    var bodyA = { messages: messages, json: !!opts.json, temperature: opts.temperature == null ? 0.3 : opts.temperature };
    var bodyB = { model: model, temperature: bodyA.temperature, messages: messages }; if (opts.json) bodyB.response_format = { type: 'json_object' };
    AI.calls++;
    return postJSON('/api/health-education', bodyA, opts.timeout).catch(function (e1) {
      return postJSON('/api/ai', bodyB, opts.timeout).catch(function (e2) { AI.lastError = e1.message + ' | ' + e2.message; throw e2; });
    }).then(function (d) {
      var txt = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (!txt) throw new Error('empty AI response');
      AI.live = true; return txt;
    }).catch(function (e) { if (AI.live == null) AI.live = false; throw e; });
  }
  function parseJSON(t) {
    t = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    var a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) t = t.slice(a, b + 1);
    try { return JSON.parse(t); } catch (e) {
      // light repair for common LLM slips: trailing commas, smart quotes as delimiters, comments
      var r = t.replace(/,\s*([}\]])/g, '$1').replace(/^\s*\/\/.*$/gm, '').replace(/[\u201c\u201d](\s*:)/g, '"$1');
      return JSON.parse(r);
    }
  }
  var SYS_AUTHOR = 'You are a patient-education author inside an EHR, writing for clinician review. Use accurate, conservative, guideline-consistent information. Never invent doses, drug names or statistics. Write directly to the patient ("you"). Keep it warm, plain and actionable. Always include clear emergency instructions (call 911) in the red zone. Respond ONLY with strict JSON.';
  var SCHEMA = '{"title":"","overview":"","causes":["",""],"treatment":["",""],"actionPlan":{"green":{"label":"","items":[""]},"yellow":{"label":"","items":[""]},"red":{"label":"","items":[""]}},"warningSigns":[""],"faqs":[{"q":"","a":""}],"takeaways":[""]}';

  function normalizeContent(c, fallbackTitle) {
    c = c || {};
    function arr(a) { return Array.isArray(a) ? a.map(function (x) { return String(x == null ? '' : x); }).filter(Boolean) : []; }
    var ap = c.actionPlan || {};
    function zone(z, lab) { z = z || {}; return { label: String(z.label || lab), items: arr(z.items) }; }
    var out = {
      title: String(c.title || fallbackTitle || ''), overview: String(c.overview || ''), causes: arr(c.causes), treatment: arr(c.treatment),
      actionPlan: { green: zone(ap.green, 'Green zone: doing well'), yellow: zone(ap.yellow, 'Yellow zone: caution'), red: zone(ap.red, 'Red zone: emergency') },
      warningSigns: arr(c.warningSigns),
      faqs: (Array.isArray(c.faqs) ? c.faqs : []).map(function (f) { return { q: String(f && f.q || ''), a: String(f && f.a || '') }; }).filter(function (f) { return f.q; }),
      takeaways: arr(c.takeaways)
    };
    if (c.personal && (c.personal.intro || (c.personal.bullets && c.personal.bullets.length))) out.personal = { intro: String(c.personal.intro || ''), bullets: arr(c.personal.bullets) };
    return out;
  }

  // closest built-in topic for the simulator
  function topicFor(name, code) {
    var n = String(name || '').toLowerCase().replace(/[^a-z ]/g, '');
    if (/ketoacid|insipidus|gestational/.test(n)) return null;
    if (code) { var ci = codeInfo(code); if (ci && D.CONTENT[ci.topic]) return ci.topic; }
    var map = [['asthma', 'asthma'], ['diabet', 'diabetes'], ['sugar', 'diabetes'], ['hypertens', 'hypertension'], ['blood pressure', 'hypertension'], ['pancreat', 'pancreatitis'], ['ankle', 'anklesprain'], ['sprain', 'anklesprain'], ['breastfe', 'breastfeeding'], ['lactat', 'breastfeeding']];
    for (var i = 0; i < map.length; i++) if (n.indexOf(map[i][0]) >= 0) return map[i][1];
    return null;
  }
  function genericContent(name) {
    var N = name || 'this condition'; var n = N.charAt(0) + N.slice(1).toLowerCase();
    return normalizeContent({
      title: 'Understanding ' + n.toLowerCase(),
      overview: 'This handout explains ' + n.toLowerCase() + ' in plain language and what you can do at home. Your care team will tailor the plan to you. [Simulated draft: connect live AI or edit this text before approving.]',
      causes: ['Your provider will explain what is most likely causing or triggering ' + n.toLowerCase() + ' for you.', 'Some triggers are things you can change; others are not. Ask which ones apply to you.'],
      treatment: ['Take any medicine exactly as prescribed and ask before starting anything new.', 'Follow the diet, activity and rest advice your provider gave you.', 'Keep your follow-up visits and any tests that were ordered.', 'Write down your symptoms and bring questions to your next visit.'],
      actionPlan: {
        green: { label: 'Green zone: doing well', items: ['Your symptoms are controlled', 'Keep following your plan and follow-up visits'] },
        yellow: { label: 'Yellow zone: call your provider', items: ['Symptoms are getting worse or not improving as expected', 'New side effects from medicine', 'You have questions about your plan'] },
        red: { label: 'Red zone: emergency', items: ['Severe symptoms, trouble breathing, chest pain, confusion or fainting', 'Call 911 or go to the nearest emergency room'] }
      },
      warningSigns: ['Severe or sudden worsening of symptoms', 'Chest pain, trouble breathing, or fainting', 'High fever that does not come down', 'Any symptom that worries you'],
      faqs: [{ q: 'When should I call the office?', a: 'Call if your symptoms get worse, you are not improving as expected, or you have side effects or questions. For emergencies call 911.' }, { q: 'Can I keep doing my normal activities?', a: 'Most people can, with some adjustments. Ask your provider what is safe for you.' }, { q: 'Who can I ask if I am unsure about my medicine?', a: 'Your pharmacist or the care team can answer medicine questions. Do not stop medicine without asking.' }],
      takeaways: ['Follow your plan and take medicine as prescribed.', 'Call your provider if things get worse.', 'Call 911 for severe symptoms.']
    }, N);
  }
  function simGenerate(p) {
    var t = topicFor(p.name, p.code), c = clone(t ? D.CONTENT[t] : genericContent(p.name));
    c = normalizeContent(c, p.name);
    if (t && p.lang && p.lang !== 'English') { var l = langCode(p.lang); if (l === 'es' && t === 'asthma') c = clone(D.CONTENT.asthma_es); }
    if (!t) c.title = 'Understanding ' + String(p.name || '').toLowerCase();
    return c;
  }

  function generateContent(p) {
    // p: {name, code, codeType, codeDesc, specialty, level, lang}
    var user = 'Create patient education for "' + p.name + '"' + (p.code ? ' (' + (p.codeType || 'ICD-10') + ' ' + p.code + (p.codeDesc ? ': ' + p.codeDesc : '') + ')' : '') +
      ', specialty ' + (p.specialty || 'Family Practice') + '. Reading level: ' + p.level + '. Write everything in ' + p.lang + '. ' +
      'Return JSON exactly in this shape: ' + SCHEMA + '. Requirements: overview 3-5 sentences; 3-5 causes/triggers; 4-6 treatment & self-care steps; action plan with green/yellow/red zones, 2-4 bullets each, red zone must tell the patient to call 911 or go to the emergency room; 3-5 warning signs; 3-4 FAQs; 3-5 key takeaways.';
    var attempt = function (temp) {
      return llm([{ role: 'system', content: SYS_AUTHOR }, { role: 'user', content: user }], { json: true, temperature: temp }).then(function (t) {
        var c = normalizeContent(parseJSON(t), p.name);
        if (!c.overview || !c.faqs.length) throw new Error('incomplete AI content');
        return { content: c, source: 'live', model: (window.__pehrAI && window.__pehrAI.label || 'Gemini') + ' via /api' };
      });
    };
    // one retry on a malformed answer (network/HTTP failures go straight to the simulator)
    return attempt(0.35).catch(function (e) { if (AI.live) return attempt(0.2); throw e; }).catch(function (e) {
      console.warn('[Health Education AI] live generation unavailable, using simulator:', e.message);
      return new Promise(function (res) { setTimeout(function () { res({ content: simGenerate(p), source: 'simulated', model: 'Built-in simulator (offline demo)' }); }, 900); });
    });
  }
  var SECTION_SHAPES = {
    overview: '{"overview":"3-5 sentence plain-language overview"}', causes: '{"causes":["3-5 strings"]}', treatment: '{"treatment":["4-6 strings"]}',
    actionPlan: '{"actionPlan":{"green":{"label":"","items":[""]},"yellow":{"label":"","items":[""]},"red":{"label":"","items":[""]}}}',
    warningSigns: '{"warningSigns":["3-5 strings"]}', faqs: '{"faqs":[{"q":"","a":""}]}  (3-4 items)', takeaways: '{"takeaways":["3-5 strings"]}'
  };
  function regenerateSection(key, p, content) {
    var user = 'Rewrite ONLY the "' + key + '" section of the patient education for "' + p.name + '" with a fresh take. Reading level: ' + p.level + '. Language: ' + p.lang + '. Keep it consistent with this existing material (do not contradict it):\n' + JSON.stringify(content).slice(0, 6000) + '\nReturn JSON exactly in this shape: ' + SECTION_SHAPES[key];
    return llm([{ role: 'system', content: SYS_AUTHOR }, { role: 'user', content: user }], { json: true, temperature: 0.6 }).then(function (t) {
      var part = normalizeContent(Object.assign({}, content, parseJSON(t)), p.name);
      return { value: part[key], source: 'live' };
    }).catch(function (e) {
      console.warn('[Health Education AI] section regenerate fallback:', e.message);
      var base = simGenerate(p);
      return new Promise(function (res) { setTimeout(function () { res({ value: base[key], source: 'simulated' }); }, 500); });
    });
  }

  function personalizeLocal(content, ctx, name) {
    var v = PATIENT.vitals, b = [], t = topicFor(name);
    b.push('You are ' + PATIENT.age + ' years old. Your plan is written at a ' + ctx.level + ' reading level in ' + ctx.lang + '.');
    var allergyText = PATIENT.allergies.map(function (a) { return a.name; }).join(' and ');
    b.push('You are allergic to ' + allergyText + '. Remind every provider and pharmacist, especially before starting a new medicine.');
    b.push('Your current medicines include ' + PATIENT.meds.map(function (m) { return m.split(' ').slice(0, 2).join(' '); }).join(', ') + '. Check with your pharmacist before adding any over-the-counter medicine or supplement.');
    if (t === 'hypertension') b.push('Your last blood pressure (' + v.date + ') was ' + v.bp + ', which is ' + (parseInt(v.bp, 10) < 130 ? 'within' : 'above') + ' the usual goal of under 130/80. Keep checking at home and bring your log.');
    else if (t === 'diabetes') b.push('You take metformin. Take it with meals, and tell your provider if you have repeated stomach upset. Your weight is ' + v.weight + ' and BMI ' + v.bmi + '; small, steady changes help.');
    else if (t === 'asthma') b.push('Your oxygen level at your last visit was ' + v.spo2 + '% and you are a ' + v.smoker.toLowerCase() + '. Staying smoke-free keeps your airways calm.');
    else b.push('At your last visit (' + v.date + ') your blood pressure was ' + v.bp + ' and your weight was ' + v.weight + '. Tell us if anything changes.');
    return { intro: 'Made for you, ' + PATIENT.first + ': this takes your age, medicines, allergies and recent vitals into account.', bullets: b };
  }
  function personalize(content, ctx, name) {
    var user = 'Personalize this patient education for the patient below. Do NOT change medical facts. Return ONLY JSON {"overview":"...", "personal":{"intro":"one sentence","bullets":["3-5 patient-specific points, max 25 words each"]}}. The overview must be the same overview rewritten with light personalization at a ' + ctx.level + ' reading level in ' + ctx.lang + '.\n' +
      'Patient: age ' + PATIENT.age + ', sex ' + PATIENT.sex + '. Allergies: ' + PATIENT.allergies.map(function (a) { return a.name + ' (' + a.note + ')'; }).join('; ') + '. Medications: ' + PATIENT.meds.join('; ') + '. Latest vitals (' + PATIENT.vitals.date + '): BP ' + PATIENT.vitals.bp + ', HR ' + PATIENT.vitals.hr + ', SpO2 ' + PATIENT.vitals.spo2 + '%, weight ' + PATIENT.vitals.weight + ', BMI ' + PATIENT.vitals.bmi + ', ' + PATIENT.vitals.smoker + '.\n' +
      (ctx.dx && ctx.dx.length ? 'Visit diagnoses: ' + ctx.dx.map(function (d) { return d.name + (d.icd ? ' (' + d.icd + ')' : ''); }).join('; ') + '.\n' : '') +
      'Topic: ' + name + '. Current overview: ' + content.overview;
    return llm([{ role: 'system', content: SYS_AUTHOR }, { role: 'user', content: user }], { json: true, temperature: 0.4 }).then(function (t) {
      var j = parseJSON(t), c = clone(content);
      if (j.overview) c.overview = String(j.overview);
      var n = normalizeContent(Object.assign({}, c, { personal: j.personal }), name);
      if (!n.personal) throw new Error('no personal block');
      return { content: n, source: 'live' };
    }).catch(function (e) {
      console.warn('[Health Education AI] personalization fallback:', e.message);
      var c = clone(content); c.personal = personalizeLocal(content, ctx, name);
      return new Promise(function (res) { setTimeout(function () { res({ content: c, source: 'simulated' }); }, 500); });
    });
  }
  function translateContent(content, langName) {
    var user = 'Translate all patient-facing text in this JSON into ' + langName + ', keeping the exact same JSON structure and keys and the same number of items. Keep medical meaning exact. Return ONLY JSON.\n' + JSON.stringify(normalizeContent(content, content.title));
    return llm([{ role: 'system', content: 'You are a certified medical translator. Respond ONLY with strict JSON.' }, { role: 'user', content: user }], { json: true, temperature: 0.1, timeout: 70000 }).then(function (t) {
      var n = normalizeContent(parseJSON(t), content.title);
      if (content.personal && !n.personal) n.personal = content.personal;
      return n;
    });
  }

  var RED_FLAGS = /(chest pain|can'?t breathe|cannot breathe|trouble breathing|short(ness)? of breath|blue lips|passed out|fainted|unconscious|stroke|seizure|suicid|kill myself|overdose|severe bleeding|vomiting blood|not breathing|anaphyla|swelling of (my )?(face|throat|tongue)|911|emergency)/i;
  var EMERGENCY_MSG = 'This could be an emergency. Please call 911 (or your local emergency number) or go to the nearest emergency room now. Do not wait for a reply from this chat or from your care team.';
  function tokens(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\u00c0-\u024f\u0600-\u06ff ]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 2 && ['the', 'and', 'for', 'you', 'your', 'are', 'can', 'what', 'how', 'when', 'with', 'that', 'this', 'have', 'does', 'should', 'will'].indexOf(w) < 0; }); }
  function simAnswer(q, c) {
    var qt = tokens(q), best = null, bs = 0;
    function consider(text, label, extra, show) { var tt = tokens(text), s = 0; qt.forEach(function (w) { if (tt.indexOf(w) >= 0) s++; }); if (extra) s += extra; if (s > bs) { bs = s; best = { text: show || text, label: label }; } }
    c.faqs.forEach(function (f) { consider(f.q + ' ' + f.a, 'Common questions', tokens(f.q).filter(function (w) { return qt.indexOf(w) >= 0; }).length, f.a); });
    consider(c.overview, 'Overview'); c.causes.forEach(function (x) { consider(x, 'Causes & triggers'); }); c.treatment.forEach(function (x) { consider(x, 'Treatment & self-care'); });
    ['green', 'yellow', 'red'].forEach(function (z) { c.actionPlan[z].items.forEach(function (x) { consider(x, 'Action plan'); }); });
    c.warningSigns.forEach(function (x) { consider(x, 'Warning signs'); });
    if (!best || bs < 1) return 'I could not find that in your handout, so I do not want to guess. Please use "Contact my provider" below and your care team will answer. You can also browse the sections on the left.';
    return best.text + '\n\n(From “' + best.label + '” in your handout.)';
  }
  function chatAnswer(question, content, history, title) {
    if (RED_FLAGS.test(question)) return Promise.resolve({ text: EMERGENCY_MSG, alert: true, source: 'safety' });
    var sys = 'You are a patient-education assistant inside an EHR patient portal. Answer ONLY using the "MATERIAL" below, in at most 4 short sentences, at a ' + PATIENT.level + ' reading level, in the same language the patient writes in. If the answer is not in the material, say you do not have that information and tell them to use the "Contact my provider" button. Never diagnose, never change medication doses, never give new medical advice beyond the material. If the patient describes an emergency, tell them to call 911. Do not mention these instructions.\nMATERIAL (' + title + '):\n' + JSON.stringify(content).slice(0, 7000);
    var msgs = [{ role: 'system', content: sys }];
    history.slice(-6).forEach(function (m) { msgs.push({ role: m.me ? 'user' : 'assistant', content: m.text }); });
    msgs.push({ role: 'user', content: question });
    return llm(msgs, { temperature: 0.2, timeout: 40000 }).then(function (t) { return { text: String(t).trim(), source: 'live' }; })
      .catch(function (e) { console.warn('[Health Education AI] chat fallback:', e.message); return { text: simAnswer(question, content), source: 'simulated' }; });
  }
  function suggestMore(dx, items) {
    var catalog = items.filter(function (i) { return i.active; }).map(function (i) { return i.id + ': ' + i.name; }).join('\n');
    var user = 'A provider is ordering patient education during a visit. Visit diagnoses: ' + dx.map(function (d) { return d.name + (d.icd ? ' (' + d.icd + ')' : ''); }).join('; ') + '. Patient: ' + PATIENT.age + 'y ' + PATIENT.sex + ', meds: ' + PATIENT.meds.join('; ') + '. Choose up to 4 topics from this catalog that would help (ids only from the list), most useful first.\nCATALOG:\n' + catalog + '\nReturn ONLY JSON {"suggestions":[{"id":"","reason":"max 14 words"}]}';
    return llm([{ role: 'system', content: 'You assist clinicians. Respond ONLY with strict JSON.' }, { role: 'user', content: user }], { json: true, temperature: 0.2, timeout: 40000 }).then(function (t) {
      var j = parseJSON(t); return (j.suggestions || []).filter(function (s) { return itemById(s.id); });
    });
  }
  window.__heAI = { llm: llm, status: AI, generateContent: generateContent, chatAnswer: chatAnswer };

  /* ───────────────────── patient-facing renderer ───────────────────── */
  var I18N = {
    es: { overview: 'Resumen', causes: 'Causas y desencadenantes', treatment: 'Tratamiento y autocuidado', actionPlan: 'Mi plan de acción', warningSigns: 'Señales de alerta: cuándo llamar', faqs: 'Preguntas frecuentes', takeaways: 'Puntos clave', personal: 'Hecho para usted', disclaimer: 'Este material es educativo y no reemplaza el consejo de su proveedor. En una emergencia llame al 911.', ask: 'Haga una pregunta', reviewed: 'Revisado clínicamente por', draft: 'Borrador: pendiente de revisión clínica', progress: 'Progreso' }
  };
  function tr(lang, key, en) { return (I18N[lang] && I18N[lang][key]) || en; }
  function isRTL(lang) { return lang === 'ar' || lang === 'ur'; }
  function ul(items) { return '<ul class="he-ul">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }

  function buildEducation(content, o) {
    // o: {lang, item, order, interactive, onSeen(key), reviewedBy, status, patientName}
    o = o || {}; var lang = o.lang || 'en';
    var root = el('div', 'he-pt'); root.dir = isRTL(lang) ? 'rtl' : 'ltr';
    var head = el('div', 'he-pt-card', '');
    head.innerHTML = '<h1>' + esc(content.title || '') + '</h1>';
    var meta = el('div', 'flex flex-wrap items-center gap-2 mt-2');
    if (o.status === 'Approved') meta.innerHTML = '<span class="he-reviewed">' + ms('verified') + esc(tr(lang, 'reviewed', 'Clinically reviewed by')) + ' ' + esc(o.reviewedBy || USER.name) + (o.reviewedAt ? ' · ' + esc(o.reviewedAt) : '') + '</span>';
    else if (o.status === 'Draft') meta.innerHTML = '<span class="he-reviewed he-reviewed--draft">' + ms('edit_note') + esc(tr(lang, 'draft', 'Draft: not yet clinically reviewed')) + '</span>';
    if (content.personal) meta.insertAdjacentHTML('beforeend', '<span class="he-badge he-badge--ai">' + ms('auto_awesome') + 'Personalized for ' + esc(PATIENT.first) + '</span>');
    head.appendChild(meta); head.setAttribute('data-sec', 'top'); root.appendChild(head);

    var cards = {};
    function card(key, icon, label, bodyHtml, cls) {
      var c = el('section', 'he-pt-card ' + (cls || ''), '<h2>' + ms(icon) + esc(label) + '<span class="he-pt-card__tick">' + ms('check_circle') + 'Viewed</span></h2><div class="he-pt-card__bd">' + bodyHtml + '</div>');
      c.setAttribute('data-sec', key); cards[key] = c; root.appendChild(c); return c;
    }
    if (content.personal) card('personal', 'auto_awesome', tr(lang, 'personal', 'Made for you'), '<p style="margin-bottom:10px">' + esc(content.personal.intro) + '</p>' + ul(content.personal.bullets), 'he-pt-for');
    card('overview', 'info', tr(lang, 'overview', 'Overview'), '<p>' + esc(content.overview) + '</p>');
    if (content.causes.length) card('causes', 'psychology_alt', tr(lang, 'causes', 'Causes & triggers'), ul(content.causes));
    if (content.treatment.length) card('treatment', 'healing', tr(lang, 'treatment', 'Treatment & self-care'), ul(content.treatment));
    var ap = content.actionPlan;
    card('actionPlan', 'traffic', tr(lang, 'actionPlan', 'My action plan'), '<div class="he-zones">' + ['green', 'yellow', 'red'].map(function (z) {
      return '<div class="he-zonecard he-zonecard--' + z + '"><h3><i></i>' + esc(ap[z].label) + '</h3><ul>' + ap[z].items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    }).join('') + '</div>');
    if (content.warningSigns.length) card('warningSigns', 'emergency', tr(lang, 'warningSigns', 'Warning signs: when to call'), ul(content.warningSigns), 'he-warn');
    if (content.faqs.length) {
      var fb = card('faqs', 'help', tr(lang, 'faqs', 'Common questions'), content.faqs.map(function (f) { return '<div class="he-faq"><button type="button">' + esc(f.q) + ms('expand_more') + '</button><div class="he-faq__a">' + esc(f.a) + '</div></div>'; }).join(''));
      $$('.he-faq button', fb).forEach(function (b) { b.addEventListener('click', function () { b.parentNode.classList.toggle('is-open'); }); });
    }
    if (content.takeaways.length) card('takeaways', 'task_alt', tr(lang, 'takeaways', 'Key takeaways'), ul(content.takeaways), 'he-take');
    root.appendChild(el('div', 'he-disclaimer', esc(tr(lang, 'disclaimer', 'This material is for education and does not replace advice from your care team. In an emergency call 911.') ) + (content.generatedNote ? '' : '')));
    root._cards = cards;
    if (o.onSeen && 'IntersectionObserver' in window) {
      var scroller = o.scroller || null;
      var io = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (en.isIntersecting) { var k = en.target.getAttribute('data-sec'); en.target.classList.add('is-seen'); o.onSeen(k); io.unobserve(en.target); } }); }, { root: scroller, threshold: 0.35 });
      Object.keys(cards).forEach(function (k) { io.observe(cards[k]); });
      root._io = io;
    }
    return root;
  }

  /* ───────────────────── patient portal overlay ───────────────────── */
  var portal = null, speech = { on: false, idx: 0 };
  function stopSpeech() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} speech.on = false; $$('.he-speaking').forEach(function (n) { n.classList.remove('he-speaking'); }); var b = $('#he-tts'); if (b) { b.classList.remove('is-on'); b.innerHTML = ms('volume_up') + 'Read aloud'; } }
  function closePortal() { stopSpeech(); if (portal) { portal.remove(); portal = null; } var f = $('.he-chatfab'); if (f) f.remove(); var c = $('.he-chat'); if (c) c.remove(); document.body.style.overflow = ''; }

  // src: {title, status, reviewedBy, reviewedAt, content, translations, order?, onSave?, readOnly?}
  function openPortal(src) {
    closePortal();
    var lang = 'en', content = src.content, trans = src.translations || {}; var order = src.order || null; var pref = order && order.lang ? langCode(order.lang) : null;
    var seen = {}; var chatHist = order && order.chat ? order.chat : [];
    portal = el('div', ''); portal.id = 'he-portal'; document.body.appendChild(portal); document.body.style.overflow = 'hidden';
    portal.innerHTML =
      '<div class="he-portal__top"><img src="logo.svg" alt="Practice EHR"><span class="tag">Patient Portal · Health Education</span>' +
      '<span style="font-size:13px;color:#56607a;margin-left:6px">' + esc(PATIENT.name) + '</span>' +
      '<div style="margin-left:auto;display:flex;gap:8px;align-items:center" data-he-noprint>' +
      '<select class="he-ptsel" id="he-lang" aria-label="Language">' + LANGS.map(function (l) { return '<option value="' + l[0] + '">' + esc(l[1]) + '</option>'; }).join('') + '</select>' +
      '<button class="he-ptbtn" id="he-tts" type="button">' + ms('volume_up') + 'Read aloud</button>' +
      '<button class="he-ptbtn" id="he-print" type="button">' + ms('print') + 'Print / PDF</button>' +
      '<button class="he-ptbtn" id="he-pclose" type="button">' + ms('close') + (src.readOnly ? 'Close preview' : 'Close') + '</button></div></div>' +
      '<div class="he-portal__body"><nav class="he-portal__nav" id="he-pnav"></nav><main class="he-portal__main" id="he-pmain"><div class="he-inner" id="he-pinner"></div></main></div>';
    var main = $('#he-pmain'), inner = $('#he-pinner'), nav = $('#he-pnav');
    var bannerHtml = src.banner || (src.readOnly ? '<b>Provider preview.</b> This is exactly what the patient sees. Chat in this preview is not saved.' : '');
    if (bannerHtml) { var bn = el('div', 'he-callout he-callout--info', ms('visibility') + '<div>' + bannerHtml + '</div>'); bn.style.cssText = 'max-width:860px;margin:0 auto 14px'; bn.setAttribute('data-he-noprint', ''); inner.parentNode.insertBefore(bn, inner); }

    function renderNav() {
      var keys = Object.keys(inner._cards || {});
      var seenCount = keys.filter(function (k) { return seen[k]; }).length;
      nav.innerHTML = '<div style="font-size:11.5px;font-weight:700;color:#64748b;letter-spacing:.04em;text-transform:uppercase">' + esc(tr(lang, 'progress', 'Progress')) + ' · ' + seenCount + '/' + keys.length + '</div><div class="he-progress"><i style="width:' + (keys.length ? Math.round(seenCount / keys.length * 100) : 0) + '%"></i></div>';
      keys.forEach(function (k) {
        var s = SECTIONS.filter(function (x) { return x.key === k; })[0] || { icon: 'auto_awesome', label: tr(lang, 'personal', 'Made for you') };
        var b = el('button', 'he-pnav' + (seen[k] ? ' is-seen' : ''), ms(s.icon) + '<span>' + esc(tr(lang, k, s.label)) + '</span>' + ms('check_circle', 'ck')); b.type = 'button';
        b.addEventListener('click', function () { inner._cards[k].scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        nav.appendChild(b);
      });
    }
    function draw() {
      var c = lang === 'en' ? content : trans[lang];
      if (!c) c = content;
      var old = inner._io; if (old) old.disconnect();
      var ph = $('.he-pt', inner); var node = buildEducation(c, {
        lang: lang, status: src.status, reviewedBy: src.reviewedBy, reviewedAt: src.reviewedAt, order: order, scroller: main,
        onSeen: function (k) { seen[k] = true; renderNav(); if (order && !src.readOnly) { markViewed(order); } }
      });
      inner.innerHTML = ''; inner.appendChild(node); inner._cards = node._cards; inner._io = node._io; seen = seen || {};
      Object.keys(node._cards).forEach(function (k) { if (seen[k]) node._cards[k].classList.add('is-seen'); });
      var ph2 = el('div', 'he-pt-printhead', '<div><b>Practice EHR · Health Education</b></div><div>' + esc(PATIENT.name) + ' · DOB ' + esc(PATIENT.dob) + ' · ' + esc(mdy()) + '</div>'); node.insertBefore(ph2, node.firstChild);
      renderNav();
    }
    function markViewed(o) { if (o.status === 'Sent') { o.status = 'Viewed'; o.viewedAt = new Date().toISOString(); saveOrders(); if (src.onChange) src.onChange(); } }
    draw();
    var sel = $('#he-lang');
    if (pref && pref !== 'en' && trans[pref]) { lang = pref; sel.value = pref; draw(); }
    sel.addEventListener('change', function () {
      var want = sel.value; stopSpeech();
      if (want === 'en' || trans[want]) { lang = want; draw(); return; }
      var before = lang; sel.disabled = true; var note = el('div', 'he-callout he-callout--ai', '<span class="he-spin"></span><div>Translating into ' + esc(LANG_NAME[want]) + ' with AI…</div>'); note.style.cssText = 'max-width:860px;margin:0 auto 14px'; main.insertBefore(note, main.firstChild);
      translateContent(content, LANG_NAME[want]).then(function (n) { trans[want] = n; lang = want; if (src.onTranslate) src.onTranslate(want, n); }).catch(function (e) {
        console.warn('[Health Education AI] translation unavailable:', e.message); sel.value = before; lang = before;
        toast('Live translation needs the AI service, which is unreachable here. Built-in translation is available for Spanish on the Asthma handout.', { kind: 'info', title: 'Translation unavailable' });
      }).then(function () { note.remove(); sel.disabled = false; draw(); });
    });
    $('#he-pclose').addEventListener('click', closePortal);
    $('#he-print').addEventListener('click', function () { window.print(); });
    $('#he-tts').addEventListener('click', function () { speech.on ? stopSpeech() : readAloud(); });
    function readAloud() {
      if (!('speechSynthesis' in window)) { toast('Read-aloud is not supported in this browser.', { kind: 'info' }); return; }
      var cs = Object.keys(inner._cards).map(function (k) { return inner._cards[k]; }); speech.on = true; speech.idx = 0;
      var b = $('#he-tts'); b.classList.add('is-on'); b.innerHTML = ms('stop_circle') + 'Stop reading';
      var code = (LANGS.filter(function (l) { return l[0] === lang; })[0] || LANGS[0])[2];
      (function next() {
        if (!speech.on || speech.idx >= cs.length) { stopSpeech(); return; }
        var c = cs[speech.idx++]; $$('.he-speaking').forEach(function (n) { n.classList.remove('he-speaking'); }); c.classList.add('he-speaking'); c.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var txt = c.innerText.replace(/\bViewed\b/, '').replace(/[\u2713\u2717]/g, ''); var u = new SpeechSynthesisUtterance(txt); u.lang = code; u.rate = 0.95;
        u.onend = next; u.onerror = function () { stopSpeech(); }; window.speechSynthesis.speak(u);
      })();
    }

    /* ask-a-question chat */
    var fab = el('button', 'he-chatfab', ms('forum') + esc(tr(lang, 'ask', 'Ask a question'))); fab.type = 'button'; document.body.appendChild(fab);
    var chat = el('div', 'he-chat'); document.body.appendChild(chat);
    chat.innerHTML = '<div class="he-chat__hd">' + ms('smart_toy', '') + '<div><b>Ask about your handout</b><small>Answers come only from “' + esc(content.title) + '”</small></div><button class="he-x" type="button" aria-label="Close chat">' + ms('close') + '</button></div>' +
      '<div class="he-chat__log" id="he-log"></div><div class="he-chat__sug" id="he-sug"></div>' +
      '<div class="he-chat__ft"><div class="he-chat__row"><input id="he-q" type="text" placeholder="Type your question…" autocomplete="off"><button class="he-chat__send" id="he-send" type="button" aria-label="Send">' + ms('send') + '</button></div>' +
      '<div class="he-chat__disc"><span>AI assistant: not a substitute for medical advice. In an emergency call 911.</span><button type="button" id="he-contact">Contact my provider</button></div></div>';
    var log = $('#he-log', chat), qin = $('#he-q', chat);
    function bubble(cls, text, extra) { var m = el('div', 'he-msg ' + cls, esc(text) + (extra || '')); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
    function seedChat() {
      log.innerHTML = ''; bubble('he-msg--bot', 'Hi ' + PATIENT.first + '! Ask me anything about your ' + content.title.toLowerCase() + ' handout. I can only answer from that material. For anything else, tap “Contact my provider”.');
      chatHist.forEach(function (m) { bubble(m.me ? 'he-msg--me' : (m.alert ? 'he-msg--alert' : 'he-msg--bot'), m.text); });
      var sug = $('#he-sug', chat); sug.innerHTML = '';
      (content.faqs.slice(0, 2).map(function (f) { return f.q; }).concat(['What are the warning signs?'])).forEach(function (q) { var c = el('button', 'he-chip', esc(q)); c.type = 'button'; c.addEventListener('click', function () { ask(q); }); sug.appendChild(c); });
    }
    seedChat();
    function ask(q) {
      q = String(q || '').trim(); if (!q) return; qin.value = ''; $('#he-sug', chat).style.display = 'none';
      chatHist.push({ me: true, text: q }); bubble('he-msg--me', q);
      var typing = el('div', 'he-msg he-msg--bot he-typing', '<i></i><i></i><i></i>'); log.appendChild(typing); log.scrollTop = log.scrollHeight;
      var c = lang === 'en' ? content : (trans[lang] || content);
      chatAnswer(q, c, chatHist.slice(0, -1), content.title).then(function (r) {
        typing.remove(); chatHist.push({ me: false, text: r.text, alert: r.alert });
        var m = bubble(r.alert ? 'he-msg--alert' : 'he-msg--bot', r.text, r.alert ? '' : '<small>' + (r.source === 'live' ? 'AI answer from your handout' : 'Matched from your handout (offline mode)') + ' · Not medical advice</small>');
        if (order && !src.readOnly) { order.chat = chatHist.slice(-30); saveOrders(); }
      });
    }
    $('#he-send', chat).addEventListener('click', function () { ask(qin.value); });
    qin.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(qin.value); });
    $('.he-x', chat).addEventListener('click', function () { chat.classList.remove('is-open'); });
    fab.addEventListener('click', function () { chat.classList.toggle('is-open'); if (chat.classList.contains('is-open')) setTimeout(function () { qin.focus(); }, 50); });
    $('#he-contact', chat).addEventListener('click', function () {
      var last = chatHist.filter(function (m) { return m.me; }).pop();
      var msgs = lsGet(KEY_MSGS, []); msgs.push({ id: uid('m'), at: new Date().toISOString(), patient: PATIENT.name, topic: content.title, question: last ? last.text : '(no question typed)', to: 'Care team · ' + USER.name }); lsSet(KEY_MSGS, msgs);
      bubble('he-msg--bot', 'Done. I sent your question to your care team (' + USER.name + '). They will reply in your portal messages. If this is urgent, call the office or 911.');
      toast(src.readOnly ? 'Preview only: in the live portal this sends a secure message to the care team.' : 'Message sent to your care team.', { kind: 'success' });
    });
  }

  /* ───────────────────── generic modal helper ───────────────────── */
  function modal(title, bodyNode, buttons, opts) {
    opts = opts || {};
    var scrim = el('div', 'he-scrim' + (opts.top ? ' is-top' : ''));
    var m = el('div', 'he-modal ' + (opts.cls || 'he-modal--sm'));
    var hd = el('div', 'he-modal__hd', '<h3>' + esc(title) + '</h3>'); var x = el('button', 'he-x', ms('close')); x.type = 'button'; x.setAttribute('aria-label', 'Close'); hd.appendChild(x);
    var bd = el('div', 'he-modal__bd'); bd.appendChild(bodyNode);
    m.appendChild(hd); m.appendChild(bd);
    var close = function () { scrim.remove(); document.removeEventListener('keydown', onKey); if (opts.onClose) opts.onClose(); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    if (buttons && buttons.length) {
      var ft = el('div', 'he-modal__ft');
      buttons.forEach(function (b) { var bt = el('button', 'he-pill ' + (b.cls || ''), b.label); bt.type = 'button'; bt.addEventListener('click', function () { if (b.onClick) b.onClick(close, bt); else close(); }); ft.appendChild(bt); b.el = bt; });
      m.appendChild(ft);
    }
    x.addEventListener('click', close); scrim.addEventListener('mousedown', function (e) { if (e.target === scrim && !opts.sticky) close(); });
    document.addEventListener('keydown', onKey); scrim.appendChild(m); document.body.appendChild(scrim);
    return { close: close, root: m, scrim: scrim };
  }
  // the app's standard modal shell (.pehr-modal.pehr-md, same as Messages / AI Scribe): ad slot stays visible,
  // fixed header and footer, one height for every modal, width from the size scale
  function stdModal(title, size, opts) {
    opts = opts || {};
    var root = el('div', 'pehr-modal pehr-md he-std open'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', title);
    root.innerHTML = '<div class="modal-stage" data-he-backdrop><div class="modal-adslot">Advertisement Space</div><div class="modal modal--' + (size || 'xl') + (opts.railed ? ' modal--railed' : '') + '">' +
      '<div class="modal__header"><div class="modal__heading"><div class="modal__title">' + esc(title) + '</div></div><div class="modal__tools"><button class="modal__close" type="button" aria-label="Close">' + ms('close') + '</button></div></div>' +
      '<div class="modal__body"></div><div class="modal__footer"><div></div><div class="modal__actions"></div></div></div></div>';
    var stage = $('.modal-stage', root);
    var close = function () { root.remove(); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; if (opts.onClose) opts.onClose(); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    $('.modal__close', root).addEventListener('click', close);
    stage.addEventListener('mousedown', function (e) { if (e.target === stage) close(); });
    document.addEventListener('keydown', onKey); document.body.appendChild(root); document.body.style.overflow = 'hidden';
    return { close: close, root: root, body: $('.modal__body', root), actions: $('.modal__actions', root) };
  }

  /* ───────────────────── SETUP module ───────────────────── */
  var NAV_GROUPS = [
    { key: 'administration', label: 'ADMINISTRATION', items: ['Practice', 'Providers', 'Users & Roles', 'Locations', 'Audit Log'] },
    { key: 'billing', label: 'BILLING', items: ['Fee Schedule', 'Insurance Plans', 'Adjustment Codes', 'Payment Types'] },
    {
      key: 'clinical', label: 'CLINICAL', open: true, items: [
        ['Template', 'description'], ['Section', 'view_agenda'], ['Lab Test', 'biotech'], ['Procedure', 'medical_services'], ['HM Followup', 'event_repeat'], ['Care Plan', 'fact_check'],
        ['Health Education', 'menu_book', true], ['Evidence-Based', 'science'], ['Predictive DSI', 'insights'], ['Immunization', 'vaccines'], ['Immunization Schedule', 'calendar_month'],
        ['Referring Provider', 'person_search'], ['Letters', 'mail'], ['Form Builder', 'dynamic_form']
      ]
    },
    { key: 'scheduling', label: 'SCHEDULING', items: ['Resources', 'Appointment Types', 'Schedule Templates', 'Reminders'] },
    { key: 'other', label: 'OTHER', items: ['Custom Fields', 'Macros', 'Dashboards'] }
  ];
  var setup = { sidebar: null, view: null, body: null, screen: 'list', filter: { name: '', status: 'active' }, page: 1, per: 20, cur: null, isNew: false, genBusy: false, openSecs: {}, dirty: false };

  function buildSetupShell() {
    var host = $('#view-home'); if (!host) return false; var parent = host.parentNode;
    setup.sidebar = el('aside', 'rep-sidebar shrink-0 border-r border-pehr-line flex flex-col bg-white'); setup.sidebar.id = 'sidebar-setup'; setup.sidebar.style.display = 'none';
    var sb = el('div', 'flex-1 overflow-y-auto scroll-thin py-4 px-3');
    NAV_GROUPS.forEach(function (g) {
      var cat = el('div', 'rep-cat' + (g.open ? '' : ' is-collapsed')); cat.setAttribute('data-cat', g.key);
      cat.innerHTML = '<button class="rep-cat-head" data-cat-toggle type="button"><span class="ms fill rep-cat-ic" style="color:#2563eb">' + (g.open ? 'remove_circle' : 'add_circle') + '</span><span class="rep-cat-title">' + esc(g.label) + '</span></button>';
      var body = el('div', 'rep-cat-body');
      g.items.forEach(function (it) {
        var name = Array.isArray(it) ? it[0] : it, icon = Array.isArray(it) ? it[1] : 'folder', live = Array.isArray(it) && it[2];
        var b = el('button', 'rep-link' + (live ? ' is-active' : ' is-soon'), '<span class="ms fill rep-fold">' + icon + '</span>' + esc(name) + (live ? '<span class="he-new">' + ms('auto_awesome') + 'AI</span>' : '<span class="he-soon">coming soon</span>'));
        b.type = 'button'; b.setAttribute('data-setup', name);
        b.addEventListener('click', function () { if (live) { setup.screen = 'list'; renderSetup(); } else toast('“' + esc(name) + '” is not part of this prototype. Health Education is.', { kind: 'info' }); });
        body.appendChild(b);
      });
      cat.appendChild(body); sb.appendChild(cat);
      $('[data-cat-toggle]', cat).addEventListener('click', function () { cat.classList.toggle('is-collapsed'); $('.rep-cat-ic', cat).textContent = cat.classList.contains('is-collapsed') ? 'add_circle' : 'remove_circle'; });
    });
    setup.sidebar.appendChild(sb);
    setup.view = el('div', 'flex-1 flex flex-col min-h-0 overflow-hidden'); setup.view.id = 'view-setup'; setup.view.style.display = 'none';
    var sc = el('div', 'flex-1 overflow-y-auto scroll-hide'); sc.style.background = '#fff'; sc.id = 'he-setup-scroll';
    setup.body = el('div', 'px-8 py-7'); sc.appendChild(setup.body); setup.view.appendChild(sc);
    var foot = el('footer', 'h-[42px] shrink-0 border-t border-pehr-line bg-white flex items-center px-5 text-[12px] text-slate-500', '<div>© 2025 Practice EHR. All rights reserved.</div><div class="flex-1"></div><div class="flex items-center gap-5"><a href="#" class="hover:text-slate-700">Privacy Policy</a><a href="#" class="hover:text-slate-700">Terms of Service</a><a href="#" class="hover:text-slate-700">Help Center</a></div>');
    setup.view.appendChild(foot);
    parent.appendChild(setup.sidebar); parent.appendChild(setup.view);
    return true;
  }

  function setNavActive(navEl, on) {
    var icon = $('.ms', navEl);
    if (on) { navEl.setAttribute('style', 'background:#dbeafe; color:#1d4ed8;'); navEl.classList.remove('text-slate-700', 'hover:bg-slate-100'); if (icon) icon.classList.remove('text-slate-500'); }
    else { navEl.removeAttribute('style'); navEl.classList.add('text-slate-700', 'hover:bg-slate-100'); if (icon) icon.classList.add('text-slate-500'); }
  }
  function showSetup() {
    if (!setup.view && !buildSetupShell()) return;
    var parent = setup.view.parentNode;
    Array.prototype.forEach.call(parent.children, function (ch) {
      if (ch === setup.view || ch === setup.sidebar) return;
      if (ch.id && (ch.id.indexOf('view-') === 0 || ch.id.indexOf('sidebar-') === 0)) ch.style.display = 'none';
    });
    setup.sidebar.style.display = ''; setup.view.style.display = '';
    var chip = $('#header-patient-chip'), ctx = $('#nav-patient-context'); if (chip) chip.style.display = 'none'; if (ctx) ctx.style.display = 'none';
    $$('[data-nav]').forEach(function (n) { setNavActive(n, n.getAttribute('data-nav') === 'setup'); });
    setup.screen = 'list'; renderSetup();
  }
  function hideSetup() {
    if (!setup.view) return;
    setup.sidebar.style.display = 'none'; setup.view.style.display = 'none';
    var n = $('[data-nav="setup"]'); if (n) setNavActive(n, false);
  }

  function aiBadge(it) {
    if (it.ai && it.ai.content) return it.ai.status === 'approved' ? '<span class="he-badge he-badge--approved">' + ms('verified') + 'AI · Approved</span>' : '<span class="he-badge he-badge--draft">' + ms('edit_note') + 'AI · Draft</span>';
    return '<span class="he-badge he-badge--none">No AI content</span>';
  }
  function renderSetup() { if (setup.screen === 'form') renderForm(); else renderList(); var s = $('#he-setup-scroll'); if (s) s.scrollTop = 0; }

  /* ── list ── */
  function filteredItems() {
    var f = setup.filter, q = f.name.trim().toLowerCase();
    var rows = store.items.filter(function (i) { return (!q || i.name.toLowerCase().indexOf(q) >= 0) && (f.status === 'all' || (f.status === 'active') === !!i.active); });
    return rows;
  }
  function renderList() {
    var b = setup.body; b.innerHTML = '';
    var f = setup.filter;
    var filt = el('div', 'max-w-[1180px] mx-auto');
    filt.innerHTML = '<div class="flex flex-wrap items-center justify-center gap-x-10 gap-y-3"><div class="flex items-center gap-3"><label class="rep-glabel" style="font-size:14px" for="he-f-name">Group Name</label><input id="he-f-name" class="rep-input" style="width:300px;height:40px" value="' + esc(f.name) + '" placeholder="Search by group name"></div>' +
      '<div class="flex items-center gap-5"><span class="rep-glabel" style="font-size:14px">Status</span>' +
      ['active', 'inactive', 'all'].map(function (s) { return '<label class="rep-radio"><input type="radio" name="he-status" value="' + s + '"' + (f.status === s ? ' checked' : '') + '><span>' + s.charAt(0).toUpperCase() + s.slice(1) + '</span></label>'; }).join('') + '</div>' +
      '<button id="he-f-go" class="h-10 px-9 rounded-full text-white text-[14px] font-semibold transition-transform hover:scale-[1.02]" style="background:#2f7bfb;" type="button">Search</button></div>';
    b.appendChild(filt);
    var card = el('div', 'he-card mt-6 max-w-[1180px] mx-auto');
    card.innerHTML = '<div class="he-card__hd"><div class="he-card__title" style="font-size:18px">Health Education</div><span class="he-card__sub">Patient education library: write once, order from any visit</span><div style="margin-left:auto;display:flex;gap:8px"><button class="he-pill he-pill--solid" id="he-create" type="button">Create Education</button></div></div>' +
      '<div class="overflow-x-auto" id="he-tablewrap"></div><div class="he-pager" id="he-pager"></div>';
    b.appendChild(card);
    var go = function () { setup.filter.name = $('#he-f-name').value; setup.filter.status = ($('input[name=he-status]:checked') || {}).value || 'active'; setup.page = 1; drawTable(); };
    $('#he-f-go').addEventListener('click', go); $('#he-f-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    $$('input[name=he-status]').forEach(function (r) { r.addEventListener('change', go); });
    $('#he-create').addEventListener('click', function () { openForm(null); });
    drawTable();
  }
  function drawTable() {
    var rows = filteredItems(), per = setup.per, pages = Math.max(1, Math.ceil(rows.length / per)); if (setup.page > pages) setup.page = pages;
    var slice = rows.slice((setup.page - 1) * per, setup.page * per);
    var w = $('#he-tablewrap'); if (!w) return;
    if (!rows.length) { w.innerHTML = '<div class="he-empty">No health education found. Try a different name or status, or choose <b>Create Education</b>.</div>'; }
    else {
      w.innerHTML = '<table class="he-table"><thead><tr><th>Group</th><th>Sort Order</th><th>Speciality</th><th>Entered By</th><th>Entry Date</th><th><span class="inline-flex items-center gap-1" style="color:#7c3aed">' + ms('auto_awesome') + 'AI Content</span></th><th>Documents</th></tr></thead><tbody>' +
        slice.map(function (i) { return '<tr data-id="' + i.id + '"><td><button type="button" class="he-link" data-open="' + i.id + '">' + esc(i.name) + '</button>' + (i.active ? '' : ' <span class="he-badge he-badge--none">Inactive</span>') + '</td><td>' + esc(i.sortOrder) + '</td><td>' + esc(i.specialty) + '</td><td>' + esc(i.enteredBy) + '</td><td>' + esc(i.entryDate) + '</td><td>' + aiBadge(i) + '</td><td>' + (i.docs.length ? '<span class="he-badge he-badge--doc">' + ms('attach_file') + i.docs.length + '</span>' : '<span style="color:#cbd5e1">-</span>') + '</td></tr>'; }).join('') + '</tbody></table>';
      $$('[data-open]', w).forEach(function (b) { b.addEventListener('click', function () { openForm(b.getAttribute('data-open')); }); });
    }
    var p = $('#he-pager'); var from = rows.length ? (setup.page - 1) * per + 1 : 0, to = Math.min(rows.length, setup.page * per);
    p.innerHTML = '<button type="button" data-pg="first" aria-label="First">' + ms('first_page') + '</button><button type="button" data-pg="prev" aria-label="Previous">' + ms('chevron_left') + '</button>Page <input id="he-pg" value="' + setup.page + '"> of ' + pages +
      '<button type="button" data-pg="next" aria-label="Next">' + ms('chevron_right') + '</button><button type="button" data-pg="last" aria-label="Last">' + ms('last_page') + '</button><span class="he-pager__info">Displaying ' + from + ' to ' + to + ' of ' + rows.length + ' items</span>';
    var set = function (n) { setup.page = Math.min(pages, Math.max(1, n)); drawTable(); };
    $$('[data-pg]', p).forEach(function (b) { var k = b.getAttribute('data-pg'); b.disabled = ((k === 'first' || k === 'prev') && setup.page <= 1) || ((k === 'next' || k === 'last') && setup.page >= pages); b.addEventListener('click', function () { set(k === 'first' ? 1 : k === 'prev' ? setup.page - 1 : k === 'next' ? setup.page + 1 : pages); }); });
    $('#he-pg').addEventListener('change', function (e) { set(parseInt(e.target.value, 10) || 1); });
  }

  /* ── create / edit form ── */
  function blankItem() { return { id: null, name: '', specialty: '', sortOrder: '0', docType: '', codeType: '', code: '', codeDesc: '', active: true, comments: '', enteredBy: USER.entered, entryDate: mdy(), docs: [], ai: null }; }
  function openForm(id) {
    var it = id ? itemById(id) : null; setup.isNew = !it; setup.cur = it ? clone(it) : blankItem(); setup.openSecs = {}; setup.screen = 'form'; renderSetup();
  }
  function persistCur(quiet) {
    var c = setup.cur; c.name = c.name.trim().toUpperCase();
    if (!c.name) { toast('Name is required.', { kind: 'error', title: 'Cannot save' }); var n = $('#he-f-nm'); if (n) n.focus(); return false; }
    if (setup.isNew) { c.id = 'he' + Date.now().toString(36); c.entryDate = mdy(); store.items.unshift(clone(c)); setup.isNew = false; }
    else { for (var i = 0; i < store.items.length; i++) if (store.items[i].id === c.id) store.items[i] = clone(c); }
    saveItems(); setup.dirty = false;
    if (!quiet) toast('Health education “' + esc(c.name) + '” saved.', { kind: 'success' });
    return true;
  }
  function renderForm() {
    var c = setup.cur, b = setup.body; b.innerHTML = '';
    var wrap = el('div', 'max-w-[1180px] mx-auto');
    wrap.innerHTML = '<div class="flex items-center gap-3 mb-5"><button type="button" class="he-iconbtn" id="he-back" aria-label="Back to list">' + ms('arrow_back') + '</button><div class="text-[18px] font-bold" style="color:#0f4c81">' + (setup.isNew ? 'New Health Education' : 'Health Education Detail') + '</div></div>';
    var form = el('div', 'he-form');
    var specOpts = '<option value="">-SELECT-</option>' + D.SPECIALTIES.map(function (s) { return '<option' + (c.specialty === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('');
    form.innerHTML =
      '<label class="he-lbl" for="he-f-nm">Name <span class="req">*</span></label><div><input id="he-f-nm" class="he-field" maxlength="120" value="' + esc(c.name) + '" style="text-transform:uppercase"><div id="he-sugg-code"></div></div>' +
      '<label class="he-lbl" for="he-f-sp">Speciality</label><select id="he-f-sp" class="he-field">' + specOpts + '</select>' +
      '<label class="he-lbl" for="he-f-so">Sort Order</label><input id="he-f-so" class="he-field" inputmode="numeric" value="' + esc(c.sortOrder) + '">' +
      '<label class="he-lbl" for="he-f-dt">Document Type</label><select id="he-f-dt" class="he-field"><option value=""></option><option' + (c.docType === 'Lab Result' ? ' selected' : '') + '>Lab Result</option><option' + (c.docType === 'Problem List' ? ' selected' : '') + '>Problem List</option></select>' +
      '<label class="he-lbl" for="he-f-ct">Code Type</label><select id="he-f-ct" class="he-field"><option value=""></option><option' + (c.codeType === 'ICD-10' ? ' selected' : '') + '>ICD-10</option><option' + (c.codeType === 'SNOMED CT' ? ' selected' : '') + '>SNOMED CT</option></select>' +
      '<label class="he-lbl" for="he-f-cd">Code</label><div class="he-code"><input id="he-f-cd" class="he-field" autocomplete="off" placeholder="Search code or description" value="' + esc(c.code ? c.code + (c.codeDesc ? ' · ' + c.codeDesc : '') : '') + '">' + ms('search') + '<div class="he-suggest he-hidden" id="he-codelist"></div></div>' +
      '<label class="he-lbl">Active</label><div><button type="button" class="he-toggle' + (c.active ? ' is-on' : '') + '" id="he-f-ac" role="switch" aria-checked="' + !!c.active + '" aria-label="Active"></button></div><div></div><div></div>' +
      '<label class="he-lbl" for="he-f-cm" style="align-self:start;padding-top:8px">Comments</label><div style="grid-column: 2 / 5"><textarea id="he-f-cm" class="he-field" rows="3" maxlength="500">' + esc(c.comments) + '</textarea></div>';
    wrap.appendChild(form);
    var act = el('div', 'flex items-center justify-center gap-3 mt-6');
    act.innerHTML = '<button type="button" class="he-pill" id="he-save">' + (setup.isNew ? 'Create Health Education' : 'Update Health Education') + '</button><button type="button" class="he-pill he-pill--solid" id="he-close">Close</button>';
    wrap.appendChild(act);
    var aiHost = el('div', 'mt-7'); aiHost.id = 'he-ai-host'; wrap.appendChild(aiHost);
    var docHost = el('div', 'mt-5 mb-8'); docHost.id = 'he-doc-host'; wrap.appendChild(docHost);
    b.appendChild(wrap);
    // wiring
    $('#he-back').addEventListener('click', function () { setup.screen = 'list'; renderSetup(); });
    $('#he-close').addEventListener('click', function () { setup.screen = 'list'; renderSetup(); });
    $('#he-save').addEventListener('click', function () { if (persistCur()) { setup.screen = 'form'; renderForm(); } });
    var nm = $('#he-f-nm');
    nm.addEventListener('input', function () { c.name = nm.value; setup.dirty = true; showCodeSuggestion(); var tp = $('#he-ai-topic'); if (tp) tp.innerHTML = topicHtml(c); });
    $('#he-f-sp').addEventListener('change', function (e) { c.specialty = e.target.value; });
    $('#he-f-so').addEventListener('input', function (e) { c.sortOrder = e.target.value.replace(/[^0-9]/g, ''); e.target.value = c.sortOrder; });
    $('#he-f-dt').addEventListener('change', function (e) { c.docType = e.target.value; });
    $('#he-f-ct').addEventListener('change', function (e) { c.codeType = e.target.value; });
    $('#he-f-cm').addEventListener('input', function (e) { c.comments = e.target.value; });
    $('#he-f-ac').addEventListener('click', function (e) { c.active = !c.active; e.currentTarget.classList.toggle('is-on', c.active); e.currentTarget.setAttribute('aria-checked', c.active); });
    // code lookup
    var cd = $('#he-f-cd'), list = $('#he-codelist'), hot = -1, matches = [];
    function pick(m) { c.code = m.code; c.codeType = m.type; c.codeDesc = m.desc; cd.value = m.code + ' · ' + m.desc; $('#he-f-ct').value = m.type; list.classList.add('he-hidden'); if (!c.name.trim() && m.topic && D.CONTENT[m.topic]) { c.name = m.desc.replace(/,.*$/, '').replace(/\(.*\)/, '').trim().toUpperCase(); nm.value = c.name; } showCodeSuggestion(); renderAI(); }
    function drawCodes() {
      var q = cd.value.toLowerCase().replace(/ · .*$/, ''); var ct = $('#he-f-ct').value;
      matches = D.CODES.filter(function (m) { return (!ct || m.type === ct) && (!q || m.code.toLowerCase().indexOf(q) >= 0 || m.desc.toLowerCase().indexOf(q) >= 0); }).slice(0, 8);
      list.innerHTML = matches.length ? matches.map(function (m, i) { return '<button type="button" data-i="' + i + '"><b>' + esc(m.code) + '</b><span>' + esc(m.desc) + '</span><small>' + esc(m.type) + '</small></button>'; }).join('') : '<div class="he-empty" style="padding:12px">No match in this demo code set.</div>';
      list.classList.remove('he-hidden'); hot = -1;
      $$('button', list).forEach(function (bt) { bt.addEventListener('mousedown', function (e) { e.preventDefault(); pick(matches[+bt.getAttribute('data-i')]); }); });
    }
    cd.addEventListener('focus', drawCodes); cd.addEventListener('input', function () { c.code = ''; c.codeDesc = ''; drawCodes(); });
    cd.addEventListener('blur', function () { setTimeout(function () { list.classList.add('he-hidden'); if (!c.code) cd.value = ''; }, 120); });
    cd.addEventListener('keydown', function (e) { var bs = $$('button', list); if (e.key === 'ArrowDown') { hot = Math.min(bs.length - 1, hot + 1); } else if (e.key === 'ArrowUp') { hot = Math.max(0, hot - 1); } else if (e.key === 'Enter' && matches[hot]) { e.preventDefault(); pick(matches[hot]); return; } else return; bs.forEach(function (x, i) { x.classList.toggle('is-hot', i === hot); }); e.preventDefault(); });
    $('#he-f-ct').addEventListener('change', function () { if (document.activeElement === cd) drawCodes(); });
    showCodeSuggestion(); renderAI(); renderDocs();
  }
  // AI auto-suggestion: link a code from the typed name
  function showCodeSuggestion() {
    var c = setup.cur, h = $('#he-sugg-code'); if (!h) return; h.innerHTML = '';
    if (c.code || c.name.trim().length < 3) return;
    var t = topicFor(c.name); if (!t) return;
    var m = D.CODES.filter(function (x) { return x.topic === t && x.type === 'ICD-10'; })[0]; if (!m) return;
    var b = el('button', 'he-aihint', ms('auto_awesome') + 'AI suggestion: link ICD-10 ' + esc(m.code) + ' · ' + esc(m.desc)); b.type = 'button';
    b.addEventListener('click', function () { c.code = m.code; c.codeType = m.type; c.codeDesc = m.desc; $('#he-f-cd').value = m.code + ' · ' + m.desc; $('#he-f-ct').value = m.type; showCodeSuggestion(); renderAI(); });
    h.appendChild(b);
  }

  /* ── Documents card (PDF / hyperlink fallback) ── */
  var sessionBlobs = {};
  function renderDocs() {
    var c = setup.cur, h = $('#he-doc-host'); if (!h) return; h.innerHTML = '';
    var card = el('div', 'he-card');
    card.innerHTML = '<div class="he-card__hd"><div class="he-card__title" style="font-size:15px">' + ms('attach_file') + 'Documents</div><span class="he-card__sub">Traditional fallback: attach a PDF or link a hyperlink instead of (or alongside) AI content</span><div style="margin-left:auto"><button class="he-pill he-pill--solid he-pill--sm" id="he-upload" type="button">Upload Document</button></div></div>' +
      '<div class="overflow-x-auto"><table class="he-table"><thead><tr><th>Document Name</th><th>Document Type</th><th>Entry Date</th><th>Entered By</th><th style="width:60px"></th></tr></thead><tbody>' +
      (c.docs.length ? c.docs.map(function (d) { return '<tr><td>' + (d.type === 'HYPERLINK' ? '<a class="he-link" href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">' + esc(d.name) + '</a>' : '<span class="he-link" data-view="' + d.id + '">' + esc(d.name) + '</span>' + (d.sessionOnly ? ' <span class="he-badge he-badge--none" title="Large file kept in memory for this session only">session only</span>' : '')) + '</td><td>' + esc(d.type) + '</td><td>' + esc(d.entryDate) + '</td><td>' + esc(d.enteredBy) + '</td><td><button class="he-iconbtn is-danger" data-del="' + d.id + '" type="button" aria-label="Delete document">' + ms('delete') + '</button></td></tr>'; }).join('') : '<tr><td colspan="5" class="he-empty" style="padding:22px">No documents attached.</td></tr>') + '</tbody></table></div>' +
      '<div class="he-pager"><span class="he-pager__info">Displaying ' + (c.docs.length ? '1 to ' + c.docs.length : '0') + ' of ' + c.docs.length + ' items</span></div>';
    h.appendChild(card);
    $('#he-upload', card).addEventListener('click', openUpload);
    $$('[data-del]', card).forEach(function (b) { b.addEventListener('click', function () { c.docs = c.docs.filter(function (d) { return d.id !== b.getAttribute('data-del'); }); if (!setup.isNew) persistCur(true); renderDocs(); toast('Document removed.', { kind: 'info' }); }); });
    $$('[data-view]', card).forEach(function (b) { b.addEventListener('click', function () { var d = c.docs.filter(function (x) { return x.id === b.getAttribute('data-view'); })[0]; if (d) previewPdf(d); }); });
  }
  function docUrl(d) { return d.dataUrl || sessionBlobs[d.id] || ''; }
  function previewPdf(d) {
    var u = docUrl(d); var body = el('div', '', u ? '<iframe src="' + u + '" style="width:100%;height:70vh;border:0"></iframe>' : '<div class="he-empty">This file was only kept for the session that uploaded it. Re-upload it to preview.</div>');
    modal(d.name, body, [{ label: 'Close', cls: 'he-pill--solid' }], { cls: 'he-modal', top: true });
  }
  function openUpload() {
    var c = setup.cur, mode = 'pdf', file = null;
    var body = el('div', '');
    body.innerHTML = '<div class="he-seg" style="margin-bottom:14px"><button type="button" class="is-on" data-m="pdf">PDF file</button><button type="button" data-m="link">Hyperlink</button></div>' +
      '<div id="he-up-pdf"><div class="he-drop" id="he-drop"><div style="font-size:14px;color:#334155;margin-bottom:6px">Drag and Drop a File here or:</div><button type="button" class="he-pill he-pill--sm" id="he-browse">' + ms('upload') + 'Browse</button><input type="file" accept="application/pdf,.pdf" id="he-file" style="display:none"><div id="he-fname" style="margin-top:10px;font-size:13px;font-weight:600;color:#2563eb"></div></div>' +
      '<div style="text-align:center;margin-top:12px;font-size:12.5px"><b>Supported file type: PDF</b><div style="color:#dc2626;font-weight:600;margin-top:4px">File size must not exceed 25 MB</div></div></div>' +
      '<div id="he-up-link" class="he-hidden"><label class="he-minilbl">Link address (URL)</label><input class="he-field" id="he-url" placeholder="https://medlineplus.gov/…"><label class="he-minilbl">Display name (optional)</label><input class="he-field" id="he-urlname" placeholder="e.g. MedlinePlus: Asthma"></div>';
    var m = modal('Upload File', body, [{ label: 'Upload File', cls: 'he-pill--solid', onClick: function (close) {
      var d = { id: uid('d'), entryDate: mdy(), enteredBy: USER.entered };
      if (mode === 'pdf') {
        if (!file) { toast('Choose a PDF first.', { kind: 'error' }); return; }
        if (file.size > 25 * 1024 * 1024) { toast('File size must not exceed 25 MB.', { kind: 'error' }); return; }
        d.name = file.name; d.type = 'PDF';
        var rd = new FileReader(); rd.onload = function () {
          if (String(rd.result).length < 1400000) d.dataUrl = rd.result; else { d.sessionOnly = true; sessionBlobs[d.id] = rd.result; }
          c.docs.push(d); if (!setup.isNew) persistCur(true); renderDocs(); toast('Document uploaded.', { kind: 'success' }); close();
        }; rd.readAsDataURL(file);
      } else {
        var url = $('#he-url').value.trim(); if (!/^https?:\/\/\S+\.\S+/i.test(url)) { toast('Enter a valid http(s) link.', { kind: 'error' }); return; }
        d.type = 'HYPERLINK'; d.url = url; d.name = $('#he-urlname').value.trim() || url; c.docs.push(d); if (!setup.isNew) persistCur(true); renderDocs(); toast('Link added.', { kind: 'success' }); close();
      }
    } }], { top: true });
    $$('[data-m]', body).forEach(function (b) { b.addEventListener('click', function () { mode = b.getAttribute('data-m'); $$('[data-m]', body).forEach(function (x) { x.classList.toggle('is-on', x === b); }); $('#he-up-pdf').classList.toggle('he-hidden', mode !== 'pdf'); $('#he-up-link').classList.toggle('he-hidden', mode !== 'link'); }); });
    var fi = $('#he-file', body), dr = $('#he-drop', body);
    var take = function (f) { if (!f) return; if (!/pdf$/i.test(f.name) && f.type !== 'application/pdf') { toast('Only PDF files are supported.', { kind: 'error' }); return; } file = f; $('#he-fname', body).textContent = f.name + ' (' + (f.size / 1048576).toFixed(2) + ' MB)'; };
    $('#he-browse', body).addEventListener('click', function () { fi.click(); }); fi.addEventListener('change', function () { take(fi.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) { dr.addEventListener(ev, function (e) { e.preventDefault(); dr.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dr.addEventListener(ev, function (e) { e.preventDefault(); dr.classList.remove('is-over'); }); });
    dr.addEventListener('drop', function (e) { take(e.dataTransfer.files[0]); });
  }

  /* ── Health Education AI card (authoring) ── */
  var GEN_MSGS = ['Reading the diagnosis code and specialty…', 'Writing a plain-language overview…', 'Building the green / yellow / red action plan…', 'Drafting common questions and key takeaways…', 'Checking safety wording…'];
  function genParams() { var c = setup.cur, a = c.ai || {}; return { name: c.name.trim(), code: c.code, codeType: c.codeType, codeDesc: c.codeDesc, specialty: c.specialty, level: (a.level || 'Grade 8'), lang: (a.lang || 'English') }; }
  function touchAI() {
    var a = setup.cur.ai; setup.dirty = true;
    if (a.status === 'approved') { a.status = 'draft'; a.reviewedBy = ''; a.reviewedAt = ''; toast('You edited approved content. It is back to <b>Draft</b> and needs to be approved again before patients see changes.', { kind: 'info', title: 'Re-approval needed' }); renderAIChrome(); }
    a.translations = {};
    a.editedAt = mdy();
  }
  function renderAIChrome() { var h = $('#he-ai-top'); if (h) h.replaceWith(buildAITop()); var f = $('#he-ai-foot'); if (f) f.replaceWith(buildAIFoot()); }
  function buildAITop() {
    var a = setup.cur.ai, top = el('div', ''); top.id = 'he-ai-top';
    if (!a || !a.content) return top;
    var st = a.status === 'approved' ? '<span class="he-badge he-badge--approved">' + ms('verified') + 'Approved</span>' : '<span class="he-badge he-badge--draft">' + ms('edit_note') + 'Draft</span>';
    top.innerHTML = '<div class="flex flex-wrap items-center gap-3">' + st + '<span class="he-src">' + ms('auto_awesome') + (a.source === 'live' ? 'Generated live by ' + esc(a.model) : a.source === 'seed' ? 'Pre-generated demo content' : 'Simulated draft (offline demo). Connect live AI for tailored content') + (a.generatedAt ? ' · ' + esc(a.generatedAt) : '') + '</span></div>';
    return top;
  }
  function buildAIFoot() {
    var a = setup.cur.ai, foot = el('div', ''); foot.id = 'he-ai-foot'; if (!a || !a.content) return foot;
    var approved = a.status === 'approved';
    foot.innerHTML = '<div class="he-stamp ' + (approved ? 'he-stamp--approved' : 'he-stamp--draft') + '">' + ms(approved ? 'verified' : 'pending_actions') +
      '<div style="flex:1;min-width:220px">' + (approved ? '<b>Clinically reviewed by ' + esc(a.reviewedBy) + '</b><small>Approved ' + esc(a.reviewedAt) + '. Patients can receive this handout.</small>' : '<b>Draft: AI-generated content must be reviewed by a clinician</b><small>Read each section, edit as needed, then approve. Draft education cannot be ordered for patients.</small>') + '</div>' +
      '<div class="he-seg" role="group" aria-label="Status"><button type="button" data-st="draft" class="' + (!approved ? 'is-on' : '') + '">Draft</button><button type="button" data-st="approved" class="' + (approved ? 'is-on is-approved' : '') + '">Approved</button></div></div>' +
      '<div class="flex flex-wrap items-center gap-2 mt-4"><button class="he-pill he-pill--sm" id="he-ai-prev" type="button">' + ms('visibility') + 'Preview as patient</button>' +
      '<button class="he-pill he-pill--sm" id="he-ai-regen" type="button">' + ms('autorenew') + 'Regenerate all</button>' +
      '<button class="he-pill he-pill--sm he-pill--danger" id="he-ai-del" type="button">' + ms('delete') + 'Discard AI content</button>' +
      '<div style="margin-left:auto;display:flex;gap:8px"><button class="he-pill he-pill--sm" id="he-ai-save" type="button">Save as draft</button><button class="he-pill he-pill--sm he-pill--solid" id="he-ai-approve" type="button">' + ms('verified') + (approved ? 'Re-sign' : 'Approve & sign') + '</button></div></div>';
    $$('[data-st]', foot).forEach(function (b) { b.addEventListener('click', function () { b.getAttribute('data-st') === 'approved' ? approveAI() : setDraft(); }); });
    $('#he-ai-prev', foot).addEventListener('click', function () { previewCur(); });
    $('#he-ai-regen', foot).addEventListener('click', function () { if (confirm('Replace all sections with newly generated content? Your edits will be lost.')) runGenerate(); });
    $('#he-ai-del', foot).addEventListener('click', function () { if (confirm('Discard the AI content for this education? Documents stay attached.')) { setup.cur.ai = null; if (!setup.isNew) persistCur(true); renderAI(); toast('AI content discarded.', { kind: 'info' }); } });
    $('#he-ai-save', foot).addEventListener('click', function () { if (persistCur()) renderForm(); });
    $('#he-ai-approve', foot).addEventListener('click', approveAI);
    return foot;
  }
  function validateForApproval(c) {
    var p = []; if (!c.overview.trim()) p.push('the overview is empty');
    if (!c.actionPlan.red.items.length) p.push('the red zone needs emergency instructions'); if (!c.warningSigns.length) p.push('add at least one warning sign');
    if (JSON.stringify(c).indexOf('[Simulated draft') >= 0) p.push('replace the “[Simulated draft…]” placeholder text with your own wording');
    return p;
  }
  function approveAI() {
    var a = setup.cur.ai; if (!a || !a.content) return;
    var probs = validateForApproval(a.content);
    if (probs.length) { toast('Please fix before approving: ' + esc(probs.join('; ')) + '.', { kind: 'error', title: 'Cannot approve yet' }); return; }
    a.status = 'approved'; a.reviewedBy = USER.name; a.reviewedAt = mdy();
    if (!persistCur(true)) { a.status = 'draft'; return; }
    renderForm(); toast('Approved and signed by <b>' + esc(USER.name) + '</b>. This education can now be ordered from visits.', { kind: 'success', title: 'Health education approved' });
  }
  function setDraft() { var a = setup.cur.ai; if (!a) return; a.status = 'draft'; a.reviewedBy = ''; a.reviewedAt = ''; if (!setup.isNew) persistCur(true); renderAIChrome(); }
  function previewCur() {
    var a = setup.cur.ai; openPortal({ title: a.content.title, content: a.content, translations: a.translations || {}, status: a.status === 'approved' ? 'Approved' : 'Draft', reviewedBy: a.reviewedBy, reviewedAt: a.reviewedAt, readOnly: true, onTranslate: function (l, n) { a.translations[l] = n; } });
  }
  function runGenerate() {
    var c = setup.cur; if (!c.name.trim()) { toast('Enter a Name first, for example “Asthma”, so the AI knows the topic.', { kind: 'error', title: 'Name needed' }); var n = $('#he-f-nm'); if (n) n.focus(); return; }
    var p = genParams(); setup.genBusy = true; renderAI();
    var i = 0, tm = setInterval(function () { var m = $('#he-gen-msg'); if (m) m.textContent = GEN_MSGS[++i % GEN_MSGS.length]; }, 1600);
    generateContent(p).then(function (r) {
      clearInterval(tm); setup.genBusy = false;
      c.ai = { status: 'draft', level: p.level, lang: p.lang, source: r.source, model: r.model, generatedAt: mdy(), content: r.content, translations: {}, reviewedBy: '', reviewedAt: '' };
      setup.openSecs = { overview: true };
      if (c.name.trim() && persistCur(true)) { renderForm(); } else renderAI();
      toast(r.source === 'live' ? 'Draft generated by AI. Review each section, then approve.' : 'Draft created with the built-in simulator because live AI is unreachable. Review and edit before approving.', { kind: r.source === 'live' ? 'success' : 'info', title: 'Health education drafted' });
    });
  }
  function topicHtml(c) { return esc(c.name.trim().toUpperCase() || 'Enter a name above') + (c.code ? ' <span class="he-badge he-badge--doc" style="margin-left:6px">' + esc(c.code) + '</span>' : ''); }
  function renderAI() {
    var h = $('#he-ai-host'); if (!h) return; h.innerHTML = '';
    var c = setup.cur, a = c.ai;
    var card = el('div', 'he-card he-ai');
    card.innerHTML = '<div class="he-card__hd"><div class="he-card__title" style="font-size:15px">' + ms('auto_awesome') + 'Health Education AI</div><span class="he-card__sub">No PDF needed: generate interactive, patient-friendly education from the diagnosis</span></div>';
    var bd = el('div', 'he-card__bd'); card.appendChild(bd);
    if (setup.genBusy) {
      bd.innerHTML = '<div class="he-gen-empty"><span class="he-spin"></span>&nbsp; <b id="he-gen-msg">' + GEN_MSGS[0] + '</b><div style="margin-top:6px;font-size:12px">This usually takes 10 to 20 seconds.</div></div>';
      h.appendChild(card); return;
    }
    // options row (reading level and language are picked per patient when ordering, not here)
    var opts = el('div', 'he-optrow');
    opts.innerHTML = '<div class="he-ofield"><span>Topic</span><div id="he-ai-topic" style="font-size:13px;font-weight:600;color:#1f2a44;height:36px;display:flex;align-items:center">' + topicHtml(c) + '</div></div>' +
      '<div style="margin-left:auto"><button class="he-pill he-pill--ai" id="he-ai-gen" type="button">' + ms('auto_awesome') + (a && a.content ? 'Regenerate with AI' : 'Generate with AI') + '</button></div>';
    bd.appendChild(opts);
    $('#he-ai-gen', opts).addEventListener('click', function () { var go = function () { runGenerate(); }; if (c.ai && c.ai.content) { if (confirm('Replace all sections with newly generated content? Your edits will be lost.')) go(); } else go(); });
    if (!a || !a.content) {
      var emp = el('div', 'he-gen-empty mt-4');
      emp.innerHTML = '<b>No AI content yet.</b><br>Click <b>Generate with AI</b> and we will draft a plain-language overview, causes &amp; triggers, treatment &amp; self-care, a green / yellow / red action plan, warning signs, FAQs and key takeaways, ready for you to edit and approve.<br><span style="font-size:12px">You can still attach a PDF or link below instead.</span>';
      bd.appendChild(emp);
    } else {
      bd.appendChild(el('div', 'mt-4')); bd.lastChild.appendChild(buildAITop());
      var secs = el('div', 'he-sections');
      SECTIONS.forEach(function (s) { secs.appendChild(buildSectionEditor(s)); });
      bd.appendChild(secs); bd.appendChild(buildAIFoot());
    }
    h.appendChild(card);
  }
  function summarize(key, c) {
    switch (key) {
      case 'overview': return c.overview.slice(0, 70) + (c.overview.length > 70 ? '…' : '');
      case 'causes': return c.causes.length + ' items'; case 'treatment': return c.treatment.length + ' steps';
      case 'actionPlan': return 'Green · Yellow · Red'; case 'warningSigns': return c.warningSigns.length + ' signs';
      case 'faqs': return c.faqs.length + ' questions'; case 'takeaways': return c.takeaways.length + ' points';
    } return '';
  }
  function lines(a) { return a.join('\n'); }
  function unlines(t) { return t.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function buildSectionEditor(s) {
    var a = setup.cur.ai, c = a.content, key = s.key;
    var sec = el('div', 'he-sec' + (setup.openSecs[key] ? ' is-open' : ''));
    var hd = el('div', 'he-sec__hd', ms(s.icon) + esc(s.label) + '<span style="font-weight:500;font-size:12px;color:#94a3b8;margin-left:6px" data-sum>' + esc(summarize(key, c)) + '</span>' + ms('expand_more', 'he-sec__chev')); hd.tabIndex = 0;
    var bd = el('div', 'he-sec__bd');
    var tools = el('div', 'he-sec__tools', '<span class="he-hint">Edit freely. Changes need clinician approval.</span>');
    var rg = el('button', 'he-pill he-pill--sm he-pill--ai', ms('autorenew') + 'Regenerate section'); rg.type = 'button'; tools.appendChild(rg); bd.appendChild(tools);
    var editor = el('div', ''); bd.appendChild(editor);
    var upd = function () { var sm = $('[data-sum]', hd); if (sm) sm.textContent = summarize(key, c); };
    var ta = function (val, rows, onIn, ph) { var t = el('textarea', 'he-field'); t.rows = rows; t.value = val; if (ph) t.placeholder = ph; t.addEventListener('input', function () { onIn(t.value); touchAI(); upd(); }); return t; };
    function draw() {
      editor.innerHTML = '';
      if (key === 'overview') editor.appendChild(ta(c.overview, 5, function (v) { c.overview = v; }));
      else if (key === 'causes' || key === 'treatment' || key === 'warningSigns' || key === 'takeaways') { editor.appendChild(el('label', 'he-minilbl', 'One item per line')); editor.appendChild(ta(lines(c[key]), Math.max(4, c[key].length + 1), function (v) { c[key] = unlines(v); })); }
      else if (key === 'actionPlan') {
        ['green', 'yellow', 'red'].forEach(function (z) {
          var box = el('div', 'he-zone he-zone--' + z); var lab = el('input', 'he-field'); lab.value = c.actionPlan[z].label; lab.addEventListener('input', function () { c.actionPlan[z].label = lab.value; touchAI(); });
          box.appendChild(el('label', 'he-minilbl', z.charAt(0).toUpperCase() + z.slice(1) + ' zone title')); box.appendChild(lab);
          box.appendChild(el('label', 'he-minilbl', 'What the patient should do (one per line)')); box.appendChild(ta(lines(c.actionPlan[z].items), 3, function (v) { c.actionPlan[z].items = unlines(v); }));
          editor.appendChild(box);
        });
      } else if (key === 'faqs') {
        c.faqs.forEach(function (f, i) {
          var box = el('div', 'he-qedit'); var q = el('input', 'he-field'); q.value = f.q; q.placeholder = 'Question'; q.addEventListener('input', function () { f.q = q.value; touchAI(); });
          var an = ta(f.a, 3, function (v) { f.a = v; }, 'Answer'); an.style.marginTop = '6px';
          var rm = el('button', 'he-iconbtn is-danger', ms('delete')); rm.type = 'button'; rm.title = 'Remove question'; rm.addEventListener('click', function () { c.faqs.splice(i, 1); touchAI(); draw(); upd(); });
          var row = el('div', 'row'); row.style.marginTop = '0'; row.appendChild(q); row.appendChild(rm); box.appendChild(row); box.appendChild(an); editor.appendChild(box);
        });
        var add = el('button', 'he-pill he-pill--sm', ms('add') + 'Add question'); add.type = 'button'; add.addEventListener('click', function () { c.faqs.push({ q: '', a: '' }); touchAI(); draw(); upd(); }); editor.appendChild(add);
      }
    }
    draw();
    rg.addEventListener('click', function () {
      rg.disabled = true; rg.innerHTML = '<span class="he-spin"></span>Regenerating…';
      var p = genParams();
      regenerateSection(key, p, c).then(function (r) {
        c[key] = r.value; touchAI(); draw(); upd(); rg.disabled = false; rg.innerHTML = ms('autorenew') + 'Regenerate section';
        toast(r.source === 'live' ? '“' + esc(s.label) + '” regenerated.' : '“' + esc(s.label) + '” refreshed from the offline simulator.', { kind: r.source === 'live' ? 'success' : 'info' });
      });
    });
    var tog = function () { sec.classList.toggle('is-open'); setup.openSecs[key] = sec.classList.contains('is-open'); };
    hd.addEventListener('click', tog); hd.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
    sec.appendChild(hd); sec.appendChild(bd); return sec;
  }

  /* ───────────────────── VISIT: Plan section ───────────────────── */
  var visit = { id: 'v-20250614', cc: 'Follow-up of type 2 diabetes mellitus and hypertension; fatigue and increased thirst for 3 weeks.', date: '06/14/2025', provider: 'ALBERTS, JOHN, MD', dx: [{ name: 'Type 2 diabetes mellitus', icd: 'E11.9' }, { name: 'Hypertension', icd: 'I10' }] };
  var planHost = null;
  var PLAN_LEFT = ['LAB', 'IMMUNIZATION', 'HM FOLLOWUP', 'HEALTH EDUCATION', 'CLINICAL NOTES'];
  var PLAN_RIGHT = ['MEDICATION', 'PROCEDURE', 'TREATMENT PLAN', 'PATIENT REFERRAL'];

  function visitOrders() { return store.orders.filter(function (o) { return o.visitId === visit.id; }); }
  function statusBadge(o) {
    if (o.status !== 'Sent') return '<span class="he-badge he-badge--viewed">' + ms('visibility') + 'Viewed</span>';
    return '<span class="he-badge he-badge--sent">' + ms('send') + 'Sent</span>';
  }
  function renderPlan(host, forceHE) {
    if (host) planHost = host; host = planHost; if (!host) return;
    var openHE = !host._init || host._heOpen; host._init = true;
    var wasOpen = {}; $$('.he-bar', host).forEach(function (b) { wasOpen[b.getAttribute('data-bar')] = b.classList.contains('is-open'); });
    host.innerHTML = '';
    var wrap = el('div', 'he-plan');
    var grid = el('div', 'he-plan__grid'); var L = el('div', 'he-plan__col'), R = el('div', 'he-plan__col'); grid.appendChild(L); grid.appendChild(R);
    function bar(name, col) {
      var isHE = name === 'HEALTH EDUCATION'; var orders = isHE ? visitOrders() : [];
      var open = (isHE && forceHE && orders.length > 0) || (wasOpen[name] != null ? wasOpen[name] : (isHE && orders.length > 0));
      var b = el('div', 'he-bar' + (open ? ' is-open' : '')); b.setAttribute('data-bar', name);
      b.innerHTML = '<div class="he-bar__hd" role="button" tabindex="0" aria-expanded="' + open + '"><span>' + name + '</span>' + (orders.length ? '<span class="he-bar__n">' + orders.length + '</span>' : '') + '<button type="button" class="he-bar__add" aria-label="Add ' + name.toLowerCase() + '">' + ms('add') + '</button></div><div class="he-bar__bd"></div>';
      var bd = $('.he-bar__bd', b);
      if (isHE) {
        if (!orders.length) bd.innerHTML = '<div style="padding:4px 2px">No health education ordered for this visit yet. Click <b>+</b> to add.</div>';
        orders.slice().reverse().forEach(function (o) {
          var r = el('div', 'he-ordrow');
          r.innerHTML = '<span class="ms" style="color:#2563eb;font-size:22px">' + (o.kind === 'document' ? 'description' : 'auto_stories') + '</span><div style="min-width:0"><div class="he-ordrow__t">' + esc(o.name) + '</div><div class="he-ordrow__s">Ordered ' + esc(o.orderedAtLabel) + (o.personalized ? ' · Personalized' : '') + (o.kind === 'ai' ? ' · ' + esc(o.lang) : ' · Document') + '</div></div>' +
            '<div class="he-ordrow__act">' + statusBadge(o) + '<button class="he-iconbtn" type="button" data-act="open" title="Open the patient view">' + ms('visibility') + '</button><button class="he-iconbtn" type="button" data-act="print" title="Print / save as PDF">' + ms('print') + '</button><button class="he-iconbtn is-danger" type="button" data-act="del" title="Remove order">' + ms('delete') + '</button></div>';
          $('[data-act=open]', r).addEventListener('click', function () { openOrder(o); });
          $('[data-act=print]', r).addEventListener('click', function () { openOrder(o); setTimeout(function () { window.print(); }, 450); });
          $('[data-act=del]', r).addEventListener('click', function () { if (confirm('Remove “' + o.name + '” from this visit?')) { store.orders = store.orders.filter(function (x) { return x.id !== o.id; }); saveOrders(); renderPlan(); toast('Health education order removed.', { kind: 'info' }); } });
          bd.appendChild(r);
        });
      } else bd.innerHTML = '<div style="padding:4px 2px">Nothing added yet. This section is not part of this prototype.</div>';
      var toggle = function () { b.classList.toggle('is-open'); $('.he-bar__hd', b).setAttribute('aria-expanded', b.classList.contains('is-open')); };
      $('.he-bar__hd', b).addEventListener('click', function (e) { if (e.target.closest('.he-bar__add')) return; toggle(); });
      $('.he-bar__hd', b).addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.target.closest('.he-bar__add')) toggle(); });
      $('.he-bar__add', b).addEventListener('click', function (e) { e.stopPropagation(); if (isHE) openAddModal(); else toast('“' + esc(name.charAt(0) + name.slice(1).toLowerCase()) + '” is not part of this prototype. Health Education is.', { kind: 'info' }); });
      col.appendChild(b);
    }
    PLAN_LEFT.forEach(function (n) { bar(n, L); }); PLAN_RIGHT.forEach(function (n) { bar(n, R); });
    wrap.appendChild(grid);
    var notes = el('div', 'he-notes', '<div class="he-notes__hd">Notes</div><div class="he-notes__tb"></div><div class="he-notes__ed" contenteditable="true" aria-label="Plan notes"></div>');
    [['format_bold', 'bold'], ['format_italic', 'italic'], ['format_underlined', 'underline'], ['format_list_bulleted', 'insertUnorderedList'], ['format_list_numbered', 'insertOrderedList'], ['undo', 'undo'], ['redo', 'redo']].forEach(function (t) {
      var bt = el('button', '', ms(t[0])); bt.type = 'button'; bt.addEventListener('mousedown', function (e) { e.preventDefault(); document.execCommand(t[1]); }); $('.he-notes__tb', notes).appendChild(bt);
    });
    var key = 'pehr-he-notes-' + visit.id, ed = $('.he-notes__ed', notes); ed.innerHTML = lsGet(key, ''); ed.addEventListener('input', debounce(function () { lsSet(key, ed.innerHTML); }, 400));
    wrap.appendChild(notes); host.appendChild(wrap);
  }
  function openOrder(o) {
    var it = itemById(o.itemId);
    if (o.kind === 'document') { openDocOrder(o, it); return; }
    openPortal({
      title: o.content.title, content: o.content, translations: o.translations || {}, status: o.reviewedBy ? 'Approved' : 'Draft', reviewedBy: o.reviewedBy, reviewedAt: o.reviewedAt, order: o,
      banner: '<b>Patient view (demo).</b> You are seeing this as ' + esc(PATIENT.name) + '. Opening sections and chatting update the order status in the visit Plan, just as they would from the patient portal.',
      onChange: function () { renderPlan(); }, onTranslate: function (l, n) { o.translations = o.translations || {}; o.translations[l] = n; saveOrders(); }
    });
  }
  function docsHtml(docs) {
    return docs.map(function (d) {
      if (d.type === 'HYPERLINK') return '<div class="he-pdfcard">' + ms('link') + '<div style="flex:1;min-width:0"><b>' + esc(d.name) + '</b><div style="font-size:12px;color:#7a8499">Web resource</div></div><a class="he-pill he-pill--sm" href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">Open</a></div>';
      var u = docUrl(d); return u ? '<iframe title="' + esc(d.name) + '" src="' + u + '" style="width:100%;height:520px;border:1px solid #e5e9f0;border-radius:10px;margin-bottom:10px"></iframe>' : '<div class="he-pdfcard">' + ms('picture_as_pdf') + '<div><b>' + esc(d.name) + '</b><div style="font-size:12px;color:#7a8499">PDF is no longer available in this browser session.</div></div></div>';
    }).join('');
  }
  function openDocOrder(o, it) {
    var docs = it ? it.docs : [];
    var body = el('div', 'he-pt'); body.innerHTML = '<h1 style="font-size:20px">' + esc(o.name) + '</h1><p style="margin-bottom:12px;color:#56607a;font-size:13.5px">Attached document(s) sent to ' + esc(PATIENT.name) + '.</p>' + (docsHtml(docs) || '<div class="he-empty">No documents attached.</div>');
    if (o.status === 'Sent') { o.status = 'Viewed'; saveOrders(); renderPlan(); }
    modal(o.name, body, [{ label: 'Close', cls: 'he-pill--solid' }], { cls: 'he-modal', top: true });
  }

  /* ── Add Health Education modal ── */
  function dxMatches(it, d) {
    var t1 = topicFor(it.name, it.code), t2 = topicFor(d.name, d.icd);
    if (it.code && d.icd && it.code === d.icd) return 'Matches ' + d.icd + ' · ' + d.name;
    if (t1 && t2 && t1 === t2) return 'Matches diagnosis ' + d.name + (d.icd ? ' (' + d.icd + ')' : '');
    return '';
  }
  function openAddModal() {
    // reading level is not asked here: personalization uses the level on the patient's chart
    var sel = null, personalize_on = false, level = PATIENT.level, lang = PATIENT.language, previewSeq = 0, cache = {};
    var m = stdModal('Add Health Education', 'xl', { railed: true });
    var body = m.body;
    body.innerHTML =
      '<div class="he-std-main"><div class="row-form" style="margin-bottom:18px"><div class="col-6"><label class="lbl" for="he-ta">Health Education <span class="req">*</span></label>' +
      '<div class="he-code"><input id="he-ta" class="fld" autocomplete="off" placeholder="Start typing, e.g. ASTH"><span class="ms">expand_more</span><div class="he-suggest he-hidden" id="he-talist"></div></div></div></div>' +
      '<div class="he-preview" id="he-prev"><div class="he-preview__empty"><div>' + ms('menu_book').replace('class="ms"', 'class="ms" style="font-size:40px;color:#cbd5e1;display:block;margin:0 auto 8px"') + 'Select a health education to preview it here.<br><span style="font-size:12px">Use the AI suggestions on the right to start from this visit\'s diagnoses.</span></div></div></div></div>' +
      '<aside class="rail-side he-side"><div><h4>' + ms('auto_awesome') + 'Suggested for this visit</h4><div style="font-size:11.5px;color:#7a8499;margin:4px 0 8px" id="he-dxline"></div><div class="flex flex-wrap gap-2" id="he-sugs"></div><div style="margin-top:8px"><button type="button" class="he-chip is-ai" id="he-more">' + ms('auto_awesome') + 'Ask AI for more ideas</button></div></div>' +
      '<hr style="border:0;border-top:1px solid #e5e9f0;margin:0">' +
      '<div><div class="flex items-center gap-3"><button type="button" class="he-toggle" id="he-pz" role="switch" aria-checked="false" aria-label="Personalize for this patient"></button><div><h4 style="margin:0">' + ms('person') + 'Personalize for this patient</h4><div style="font-size:11.5px;color:#7a8499;margin-top:2px">AI tailors the handout to ' + esc(PATIENT.first) + '</div></div></div>' +
      '<dl class="he-ptctx" style="margin-top:10px"><dt>Patient</dt><dd>' + esc(PATIENT.name) + ', ' + PATIENT.age + ' y, ' + esc(PATIENT.sex) + '</dd><dt>Allergies</dt><dd>' + PATIENT.allergies.map(function (a) { return esc(a.name); }).join(', ') + '</dd><dt>Meds</dt><dd>' + PATIENT.meds.map(function (m) { return esc(m.split(' ').slice(0, 2).join(' ')); }).join(', ') + '</dd><dt>Vitals</dt><dd>BP ' + esc(PATIENT.vitals.bp) + ', HR ' + PATIENT.vitals.hr + ', BMI ' + PATIENT.vitals.bmi + ', ' + esc(PATIENT.vitals.date) + '</dd></dl>' +
      '<div style="margin-top:12px"><label class="lbl" for="he-lang-sel">Preferred language</label><select class="fld" id="he-lang-sel" data-dd>' + LANGS.map(function (l) { var n = l[1].split(' (')[0]; return '<option' + (n === lang ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="he-callout he-callout--info">' + ms('shield') + '<div>AI content is reviewed and approved by a clinician in Setup before it can be ordered.</div></div></aside>';
    m.actions.innerHTML = '<button class="btn" id="he-o3" type="button">Close</button><button class="btn is-disabled" id="he-o1" type="button">Order</button><button class="btn btn-blue is-disabled" id="he-o2" type="button">Order &amp; Close</button>';
    var ta = $('#he-ta', body), list = $('#he-talist', body), prev = $('#he-prev', body), hot = -1, shown = [];
    var o1 = $('#he-o1', m.root), o2 = $('#he-o2', m.root), o3 = $('#he-o3', m.root);
    function canOrder() { if (!sel) return false; if (sel.ai && sel.ai.content) return sel.ai.status === 'approved'; return sel.docs.length > 0; }
    function setBtns() { [o1, o2].forEach(function (b) { b.classList.toggle('is-disabled', !canOrder()); }); }
    function drawList() {
      var q = ta.value.trim().toLowerCase();
      shown = store.items.filter(function (i) { return i.active && (!q || i.name.toLowerCase().indexOf(q) >= 0); }).slice(0, 8);
      list.innerHTML = shown.length ? shown.map(function (i, k) { return '<button type="button" data-k="' + k + '"><b style="min-width:0;flex:1">' + esc(i.name) + '</b><small>' + (i.ai && i.ai.content ? (i.ai.status === 'approved' ? 'AI · approved' : 'AI · draft') : i.docs.length ? 'document' : 'empty') + '</small></button>'; }).join('') : '<div class="he-empty" style="padding:12px">No active health education found.</div>';
      list.classList.remove('he-hidden'); hot = -1;
      $$('button', list).forEach(function (b) { b.addEventListener('mousedown', function (e) { e.preventDefault(); choose(shown[+b.getAttribute('data-k')]); }); });
    }
    ta.addEventListener('focus', drawList); ta.addEventListener('input', function () { drawList(); });
    ta.addEventListener('blur', function () { setTimeout(function () { list.classList.add('he-hidden'); }, 120); });
    ta.addEventListener('keydown', function (e) { var bs = $$('button', list); if (e.key === 'ArrowDown') hot = Math.min(bs.length - 1, hot + 1); else if (e.key === 'ArrowUp') hot = Math.max(0, hot - 1); else if (e.key === 'Enter' && shown[hot]) { e.preventDefault(); choose(shown[hot]); return; } else return; bs.forEach(function (x, i) { x.classList.toggle('is-hot', i === hot); }); e.preventDefault(); });
    setTimeout(function () { ta.focus(); }, 30);

    // suggestions
    $('#he-dxline', body).textContent = visit.dx.length ? 'Based on this visit\'s diagnoses: ' + visit.dx.map(function (d) { return d.name + (d.icd ? ' (' + d.icd + ')' : ''); }).join(', ') : 'This visit has no diagnoses recorded yet.';
    var sugHost = $('#he-sugs', body), seenSug = {};
    function addSug(it, reason, ai) {
      if (seenSug[it.id]) return; seenSug[it.id] = 1;
      var done = visitOrders().some(function (o) { return o.itemId === it.id; });
      var b = el('button', 'he-chip' + (ai ? ' is-ai' : ''), ms(ai ? 'auto_awesome' : 'star') + esc(it.name.charAt(0) + it.name.slice(1).toLowerCase()) + (done ? ' <small>ordered</small>' : '')); b.type = 'button'; b.title = reason; b.setAttribute('data-sug', it.id);
      b.addEventListener('click', function () { choose(it); }); sugHost.appendChild(b);
    }
    var any = false; store.items.forEach(function (it) { if (!it.active) return; for (var i = 0; i < visit.dx.length; i++) { var r = dxMatches(it, visit.dx[i]); if (r) { addSug(it, r, false); any = true; break; } } });
    if (!any) sugHost.innerHTML = '<span style="font-size:12px;color:#94a3b8">No library match yet. Try “Ask AI for more ideas”.</span>';
    $('#he-more', body).addEventListener('click', function (e) {
      var b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="he-spin"></span>Thinking…';
      suggestMore(visit.dx, store.items).then(function (sg) { if (!any) sugHost.innerHTML = ''; any = true; sg.slice(0, 4).forEach(function (s) { addSug(itemById(s.id), s.reason || 'Suggested by AI', true); }); if (!sg.length) toast('No additional ideas right now.', { kind: 'info' }); })
        .catch(function () { toast('AI suggestions need the live AI service, which is unreachable. The diagnosis matches above are still available.', { kind: 'info', title: 'AI unavailable' }); })
        .then(function () { b.disabled = false; b.innerHTML = ms('auto_awesome') + 'Ask AI for more ideas'; });
    });
    // options
    var pz = $('#he-pz', body);
    pz.addEventListener('click', function () { personalize_on = !personalize_on; pz.classList.toggle('is-on', personalize_on); pz.setAttribute('aria-checked', personalize_on); preview(); });
    var DD = window.__pehrDropdown, langSel = $('#he-lang-sel', body), langEl = (DD && DD.upgrade(langSel)) || langSel;
    langEl.addEventListener('change', function () { lang = (DD ? DD.valueOf(langEl) : langSel.value) || 'English'; preview(); });
    o3.addEventListener('click', m.close);
    o1.addEventListener('click', function () { doOrder(false); }); o2.addEventListener('click', function () { doOrder(true); });

    function choose(it) { sel = it; ta.value = it.name; list.classList.add('he-hidden'); preview(); }
    function personalCtx() { return { level: level, lang: lang, dx: visit.dx }; }
    function finalContent() {
      // resolves {content, personalized, source}
      var a = sel.ai.content, ck = sel.id + '|' + personalize_on + '|' + level + '|' + lang;
      if (cache[ck]) return Promise.resolve(cache[ck]);
      var p = personalize_on ? personalize(a, personalCtx(), sel.name) : Promise.resolve({ content: a, source: 'none' });
      return p.then(function (r) { var out = { content: r.content, personalized: personalize_on, source: r.source }; cache[ck] = out; return out; });
    }
    function preview() {
      var seq = ++previewSeq; setBtns();
      if (!sel) return;
      prev.innerHTML = '';
      var a = sel.ai && sel.ai.content ? sel.ai : null;
      if (a) {
        var top = el('div', 'p-3'); prev.appendChild(top);
        if (a.status !== 'approved') {
          top.appendChild(el('div', 'he-callout he-callout--warn', ms('lock') + '<div><b>Draft: needs clinician approval.</b> AI-generated education cannot be ordered until it is reviewed and approved in Setup.</div><button type="button" class="he-pill he-pill--sm" style="margin-left:auto" id="he-gosetup">Open in Setup</button>'));
          $('#he-gosetup', top).addEventListener('click', function () { m.close(); showSetup(); openForm(sel.id); });
        }
        var holder = el('div', 'mt-2'); top.appendChild(holder);
        holder.innerHTML = '<div class="he-gen-empty"><span class="he-spin"></span>&nbsp; <b>' + (personalize_on ? 'Personalizing for ' + esc(PATIENT.first) + '…' : 'Loading preview…') + '</b></div>';
        finalContent().then(function (r) {
          if (seq !== previewSeq) return;
          var c = r.content, notes = [];
          if (lang !== 'English' && !(sel.ai.translations && sel.ai.translations[langCode(lang)])) notes.push('Will be translated to ' + esc(lang) + ' with AI when ordered.');
          holder.innerHTML = '';
          if (personalize_on) holder.appendChild(el('div', 'he-callout he-callout--ai', ms('auto_awesome') + '<div>' + (r.source === 'live' ? 'Personalized by AI using ' + esc(PATIENT.first) + '\'s age, medicines, allergies and vitals.' : 'Personalized with the built-in rules (live AI unreachable): uses age, allergies, medicines and vitals.') + '</div>'));
          if (notes.length) holder.appendChild(el('div', 'he-callout he-callout--info mt-2', ms('translate') + '<div>' + notes.join(' ') + '</div>'));
          var node = buildEducation(c, { lang: langCode(lang) === 'es' && sel.ai.translations && sel.ai.translations.es ? 'es' : 'en', status: a.status === 'approved' ? 'Approved' : 'Draft', reviewedBy: a.reviewedBy, reviewedAt: a.reviewedAt });
          node.style.marginTop = '10px'; holder.appendChild(node);
        });
      } else if (sel.docs.length) {
        var pd = el('div', 'p-3 he-pt'); pd.innerHTML = '<div class="he-callout he-callout--info mb-3">' + ms('description') + '<div>Traditional document education. No AI content yet. <button type="button" class="he-link" id="he-gosetup2">Generate AI education in Setup</button></div></div>' + docsHtml(sel.docs); prev.appendChild(pd);
        $('#he-gosetup2', pd).addEventListener('click', function () { m.close(); showSetup(); openForm(sel.id); });
      } else {
        prev.innerHTML = '<div class="he-preview__empty"><div>' + ms('post_add').replace('class="ms"', 'class="ms" style="font-size:40px;color:#cbd5e1;display:block;margin:0 auto 8px"') + '<b>' + esc(sel.name) + '</b> has no content yet.<br><span style="font-size:12px">Add a PDF or generate AI content in Setup.</span><br><button type="button" class="he-pill he-pill--sm mt-3" id="he-gosetup3">Open in Setup</button></div></div>';
        $('#he-gosetup3', prev).addEventListener('click', function () { m.close(); showSetup(); openForm(sel.id); });
      }
    }
    function doOrder(close) {
      if (!canOrder()) { if (sel && sel.ai && sel.ai.content && sel.ai.status !== 'approved') toast('This education is still a Draft. Approve it in Setup first.', { kind: 'error', title: 'Cannot order' }); else toast('Select a health education to order.', { kind: 'error' }); return; }
      if (visitOrders().some(function (o) { return o.itemId === sel.id; })) { toast('“' + esc(sel.name) + '” is already ordered for this visit.', { kind: 'info' }); return; }
      var btn = close ? o2 : o1; var old = btn.innerHTML; btn.classList.add('is-disabled'); btn.innerHTML = '<span class="he-spin"></span>Ordering…';
      var finish = function (order) {
        order.id = uid('o'); order.visitId = visit.id; order.itemId = sel.id; order.name = sel.name; order.orderedAt = new Date().toISOString(); order.orderedAtLabel = mdy() + ' by ' + USER.short; order.orderedBy = USER.name; order.status = 'Sent'; order.chat = [];
        store.orders.push(order); saveOrders(); renderPlan(null, true); btn.innerHTML = old;
        toast('<b>' + esc(sel.name) + '</b> ordered for ' + esc(PATIENT.name) + '. It is now in the patient portal.', { kind: 'success', title: 'Health education ordered' });
        if (close) m.close(); else { var nm = sel.name; sel = null; ta.value = ''; prev.innerHTML = '<div class="he-preview__empty"><div>Ordered <b>' + esc(nm) + '</b>. Select another to add more.</div></div>'; setBtns(); renderSugRefresh(); }
      };
      if (!(sel.ai && sel.ai.content)) { finish({ kind: 'document', lang: 'English', level: '-', personalized: false }); return; }
      finalContent().then(function (r) {
        var base = { kind: 'ai', content: r.content, personalized: r.personalized, lang: lang, level: level, reviewedBy: sel.ai.reviewedBy, reviewedAt: sel.ai.reviewedAt, translations: {} };
        var lc = langCode(lang);
        if (lc !== 'en') {
          var have = !r.personalized && sel.ai.translations && sel.ai.translations[lc];
          if (have) { base.translations[lc] = clone(have); finish(base); return; }
          translateContent(r.content, LANG_NAME[lc]).then(function (n) { base.translations[lc] = n; finish(base); }).catch(function () { base.lang = 'English'; toast('Live translation was unavailable, so this was ordered in English. The patient can retry the language toggle in the portal.', { kind: 'info', title: 'Ordered in English' }); finish(base); });
        } else finish(base);
      });
    }
    function renderSugRefresh() { $$('[data-sug]', sugHost).forEach(function (b) { if (visitOrders().some(function (o) { return o.itemId === b.getAttribute('data-sug'); }) && !$('small', b)) b.insertAdjacentHTML('beforeend', ' <small>ordered</small>'); }); }
  }

  /* ───────────────────── wiring into the prototype ───────────────────── */
  function parseVisitRow(a) {
    var row = a.closest('.rounded-xl') || a.parentNode; var title = a.textContent.replace(/^\s*Chief Complaint:\s*/i, '').trim();
    var meta = (a.nextElementSibling && a.nextElementSibling.textContent || '').split('·').map(function (x) { return x.trim(); });
    var dx = $$('.dx-pill', row).map(function (p) { return { name: p.textContent.trim(), icd: (p.getAttribute('data-icd') || '').replace(/^ICD-10:\s*/i, '') }; });
    var date = meta[1] || mdy();
    return { id: 'v-' + date.replace(/\D/g, '') + '-' + title.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10), cc: title, date: date, provider: (meta[0] || '').replace(/^Dr\.\s*/, 'Dr. '), dx: dx };
  }
  function openVisitPlan(v) {
    visit = v || visit;
    var V = window.__pehrVISIT; if (V) { V.date = visit.date; V.cc = visit.cc; if (visit.provider) V.provider = visit.provider.toUpperCase().indexOf(',') >= 0 ? visit.provider : V.provider; }
    if (window.__pehrShowView) { /* already in patients */ }
    if (window.__pehrShowPatientSub) window.__pehrShowPatientSub('openvisit');
    if (window.__pehrOVDebug) window.__pehrOVDebug.setTab('Plan');
    if (planHost) planHost._init = false;
    renderPlan();
  }
  window.__pehrHE = { renderPlan: function (host) { renderPlan(host); }, openVisitPlan: openVisitPlan, showSetup: showSetup, store: store, resetDemo: window.__heResetDemo };

  function wire() {
    var setupNav = $('[data-nav="setup"]');
    if (setupNav) setupNav.addEventListener('click', showSetup);
    ['home', 'patients', 'reports', 'billing'].forEach(function (k) { var n = $('[data-nav="' + k + '"]'); if (n) n.addEventListener('click', hideSetup); });
    var pv = $('#view-patient');
    if (pv) pv.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a || !/^\s*Chief Complaint:/i.test(a.textContent)) return;
      e.preventDefault(); openVisitPlan(parseVisitRow(a));
    });
    // patient-sidebar “Open Visit” reached without choosing a visit keeps the default (06/14/2025) visit
    $$('#sidebar-patient .dash-item').forEach(function (it) { var l = $('.dash-label', it); if (l && l.textContent.trim() === 'Open Visit') it.addEventListener('click', function () { visit = { id: 'v-20250614', cc: 'Follow-up of type 2 diabetes mellitus and hypertension; fatigue and increased thirst for 3 weeks.', date: '06/14/2025', provider: 'ALBERTS, JOHN, MD', dx: [{ name: 'Type 2 diabetes mellitus', icd: 'E11.9' }, { name: 'Hypertension', icd: 'I10' }] }; var V = window.__pehrVISIT; if (V) { V.date = visit.date; V.cc = visit.cc; V.provider = visit.provider; } }); });
    // deep link: #setup/health-education
    if (/^#setup/i.test(location.hash)) showSetup();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
