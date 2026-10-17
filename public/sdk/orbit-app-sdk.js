/*!
 * OrbitCRM App SDK v1 — include in any page embedded by OrbitCRM (dialer, settings page, item panel).
 *   <script src="https://<your-orbit-host>/sdk/orbit-app-sdk.js"></script>
 *   const ctx = await Orbit.init();           // { user, workspace, installationId, item?, surface }
 *   Orbit.on("dial", ({ phone, item }) => …) // dialer: user clicked a phone number
 *   await Orbit.activities.log({ itemId, type: "call", outcome: "Connected", durationSec: 95, text: "…" })
 *   await Orbit.items.update(itemId, { "Status": "Contacted" })
 *   await Orbit.triggers.fire("call_ended", { outcome: "Connected" }, itemId)
 *   await Orbit.settings.get() / Orbit.settings.save({...})
 */
(function () {
  var seq = 0, pending = {}, handlers = {}, ctx = null;
  function call(method, params) {
    return new Promise(function (resolve, reject) {
      var id = ++seq;
      pending[id] = { resolve: resolve, reject: reject };
      window.parent.postMessage({ orbit: 1, id: id, method: method, params: params || {} }, "*");
      setTimeout(function () {
        if (pending[id]) { pending[id].reject(new Error("Orbit SDK: timeout calling " + method)); delete pending[id]; }
      }, 20000);
    });
  }
  window.addEventListener("message", function (e) {
    var m = e.data;
    if (!m || m.orbit !== 1) return;
    if (m.id && pending[m.id]) {
      if (m.error) pending[m.id].reject(new Error(m.error)); else pending[m.id].resolve(m.result);
      delete pending[m.id];
    } else if (m.event) {
      if (m.event === "context") ctx = m.data;
      (handlers[m.event] || []).forEach(function (h) { try { h(m.data); } catch (err) { console.error(err); } });
    }
  });
  window.Orbit = {
    version: "1.0.0",
    init: function () { return call("getContext").then(function (c) { ctx = c; return c; }); },
    context: function () { return ctx; },
    on: function (event, handler) { (handlers[event] = handlers[event] || []).push(handler); },
    items: {
      get: function (id) { return call("getItem", { id: id }); },
      update: function (id, values) { return call("updateItem", { id: id, values: values }); },
    },
    activities: { log: function (a) { return call("logActivity", Object.assign({ item_id: a.itemId }, a)); } },
    triggers: { fire: function (key, data, itemId) { return call("fireTrigger", { key: key, data: data || {}, item_id: itemId }); } },
    settings: { get: function () { return call("getSettings"); }, save: function (s) { return call("saveSettings", s); } },
    ui: {
      toast: function (text) { return call("toast", { text: text }); },
      resize: function (height) { return call("resize", { height: height }); },
      close: function () { return call("close"); },
    },
  };
})();
