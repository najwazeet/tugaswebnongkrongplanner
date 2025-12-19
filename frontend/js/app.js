// js/app.js
function NP_generateCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function NP_uid() {
  return "id_" + Math.random().toString(36).slice(2, 10);
}
function NP_qs(name, url) {
  url = url || location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  const m = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)").exec(url);
  return !m ? null : !m[2] ? "" : decodeURIComponent(m[2].replace(/\+/g, " "));
}
function NP_fmt(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleString();
}
function NP_fmtDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "-" : d.toLocaleDateString();
}
function NP_fmtTime(iso) {
  const d = new Date(iso);
  return isNaN(d)
    ? "-"
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function NP_escape(s) {
  return String(s ?? "").replace(
    /[&<>\"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
}
function NP_copy(t) {
  return navigator.clipboard?.writeText(t);
}
window.NP_UTIL = {
  NP_generateCode,
  NP_uid,
  NP_qs,
  NP_fmt,
  NP_fmtDate,
  NP_fmtTime,
  NP_escape,
  NP_copy,
};
