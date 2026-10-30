// A bookmarklet that fills common application-form fields from the answer bank.
// It runs on the job page (Greenhouse, Lever, Ashby, Workday, Google Forms...), matching inputs by their labels.
import { getVal } from './questions';

export function autofillValues(a: Record<string, unknown>) {
  const s = (k: string) => { const v = getVal(a, k); return v === undefined || v === null ? '' : Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v); };
  const first = s('legalFirstName'), last = s('legalLastName');
  return {
    first, last, full: [first, s('legalMiddleName'), last].filter(Boolean).join(' '), preferred: s('preferredName') || first,
    email: s('email'), phone: s('phone'), linkedin: s('linkedin'), github: s('github'), website: s('portfolioUrl'),
    street: s('address/street'), city: s('address/city'), state: s('address/state'), zip: s('address/postalCode'), country: s('address/country'),
    location: [s('address/city'), s('address/state')].filter(Boolean).join(', '),
    authorized: s('workAuthorizedUS'), sponsorship: s('sponsorshipAnswer').startsWith('No') ? 'No' : 'Yes', visa: s('visaStatus'),
    school: s('educationDetails/gradSchool'), degree: s('educationDetails/gradDegree'), major: s('educationDetails/gradMajor'), gpa: s('educationDetails/gradGpa'), gradEnd: s('educationDetails/gradEnd'),
    start: s('startDate'), relocate: s('relocate'), salary: s('salaryFullTimeBase') || s('salaryInternHourly'), howHeard: s('howHeard'),
    gender: s('eeoPolicy').startsWith('Decline') ? 'Decline' : s('gender'), race: s('eeoPolicy').startsWith('Decline') ? 'Decline' : s('raceEthnicity'),
    veteran: s('eeoPolicy').startsWith('Decline') ? 'Decline' : s('veteran'), disability: s('eeoPolicy').startsWith('Decline') ? 'Decline' : s('disability'),
    pronouns: s('pronouns'), languages: s('languages'),
  };
}

// The code below is stringified into the bookmarklet; keep it self-contained ES5-ish.
function fillPage(A: Record<string, string>) {
  var R: [RegExp, string][] = [
    [/\b(first|given)\s*name/i, 'first'], [/\b(last|family|sur)\s*name/i, 'last'], [/preferred\s*name|nickname/i, 'preferred'], [/full\s*name|^name$|your name/i, 'full'],
    [/e-?mail/i, 'email'], [/phone|mobile|telephone/i, 'phone'], [/linkedin/i, 'linkedin'], [/github/i, 'github'], [/website|portfolio|personal site|url/i, 'website'],
    [/street|address line/i, 'street'], [/\bcity\b/i, 'city'], [/\bstate\b|province|region/i, 'state'], [/zip|postal/i, 'zip'], [/country/i, 'country'],
    [/current location|where are you (located|based)|location/i, 'location'],
    [/sponsor/i, 'sponsorship'], [/authori[sz]ed|legally (able|eligible) to work|work authorization/i, 'authorized'], [/visa|immigration status/i, 'visa'],
    [/school|university|college|institution/i, 'school'], [/degree/i, 'degree'], [/major|field of study|discipline/i, 'major'], [/gpa/i, 'gpa'], [/graduat/i, 'gradEnd'],
    [/start date|available|availability|earliest/i, 'start'], [/relocat/i, 'relocate'], [/salary|compensation|pay expectation/i, 'salary'], [/how did you hear|source|referr/i, 'howHeard'],
    [/gender/i, 'gender'], [/race|ethnic/i, 'race'], [/veteran/i, 'veteran'], [/disabilit/i, 'disability'], [/pronoun/i, 'pronouns'], [/language/i, 'languages'],
  ];
  function labelOf(el: any): string {
    var t = '';
    if (el.id) { var l = document.querySelector('label[for="' + el.id + '"]'); if (l) t += ' ' + (l as HTMLElement).innerText; }
    var p = el.closest('label'); if (p) t += ' ' + p.innerText;
    var lb = el.getAttribute('aria-labelledby'); if (lb) lb.split(' ').forEach(function (id: string) { var e = document.getElementById(id); if (e) t += ' ' + e.innerText; });
    t += ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.placeholder || '') + ' ' + (el.name || '') + ' ' + (el.id || '');
    if (!t.trim()) { var w = el.closest('div,fieldset,section'); if (w) t += ' ' + (w.innerText || '').slice(0, 120); }
    return t.replace(/\s+/g, ' ').trim();
  }
  function setNative(el: any, v: string) {
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    var d = Object.getOwnPropertyDescriptor(proto, 'value');
    if (d && d.set) d.set.call(el, v); else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true }));
  }
  var filled = 0, skipped: string[] = [];
  var els = Array.prototype.slice.call(document.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=submit]):not([type=button]), textarea, select'));
  var doneRadio: Record<string, boolean> = {};
  els.forEach(function (el: any) {
    if (el.disabled || el.readOnly) return;
    var rect = el.getBoundingClientRect(); if (rect.width === 0 && rect.height === 0 && el.type !== 'radio') return;
    var label = labelOf(el); var key = '';
    for (var i = 0; i < R.length; i++) { if (R[i][0].test(label)) { key = R[i][1]; break; } }
    if (!key || !A[key]) return;
    var v = A[key];
    if (el.type === 'radio') {
      var g = el.name || label; if (doneRadio[g]) return;
      var own = (el.closest('label') ? el.closest('label').innerText : '') + ' ' + (el.value || '');
      var want = /^(yes|no)$/i.test(v) ? v : v.split(/[,(]/)[0];
      if (own.toLowerCase().indexOf(want.toLowerCase()) >= 0) { el.click(); doneRadio[g] = true; filled++; }
      return;
    }
    if (el.type === 'checkbox') return;
    if (el.tagName === 'SELECT') {
      var opts = Array.prototype.slice.call(el.options); var want2 = v.toLowerCase();
      var hit = opts.find(function (o: any) { return o.text.toLowerCase() === want2; }) || opts.find(function (o: any) { return o.text.toLowerCase().indexOf(want2.split(/[,(]/)[0].trim()) >= 0; });
      if (hit) { setNative(el, hit.value); filled++; } else skipped.push(label.slice(0, 40));
      return;
    }
    if (el.value && el.value.trim()) return;
    setNative(el, v); filled++;
  });
  alert('Apply for me: filled ' + filled + ' field' + (filled === 1 ? '' : 's') + '. Check every box before you submit.' + (skipped.length ? '\nCould not match a dropdown option for: ' + skipped.join(', ') : ''));
}

export function bookmarklet(a: Record<string, unknown>): string {
  const values = autofillValues(a);
  return 'javascript:' + encodeURIComponent('(' + fillPage.toString() + ')(' + JSON.stringify(values) + ')');
}
