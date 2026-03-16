export function qs(name){
  return new URLSearchParams(window.location.search).get(name);
}
export function escapeHtml(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}