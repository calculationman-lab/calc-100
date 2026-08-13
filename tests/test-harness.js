const fs = require("fs");
const path = require("path");
const vm = require("vm");

function createHarness(initialValue = null) {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const source = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const store = new Map();
  if (initialValue !== null) store.set("calcRPG", typeof initialValue === "string" ? initialValue : JSON.stringify(initialValue));
  const nodes = new Map();
  const timerStats = { started: 0, cleared: 0 };
  let confirmResult = true;

  function makeNode(dataset = {}) {
    const classes = new Set();
    return {
      dataset,
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        toggle(name, force) {
          const next = force === undefined ? !classes.has(name) : Boolean(force);
          if (next) classes.add(name); else classes.delete(name);
          return next;
        },
        contains(name) { return classes.has(name); },
      },
      style: {}, innerHTML: "", textContent: "", onclick: null,
    };
  }

  const keys = ["7","8","9","4","5","6","1","2","3","B","0","E"].map(k => makeNode({ k }));
  const math = Object.create(Math);
  const context = {
    console, Date, Math: math, JSON, Set, Number,
    clearInterval() { timerStats.cleared++; },
    setInterval() { timerStats.started++; return timerStats.started; },
    addEventListener() {},
    confirm() { return confirmResult; },
    navigator: {},
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
    },
    document: {
      body: makeNode(),
      getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, makeNode());
        return nodes.get(id);
      },
      querySelectorAll(selector) { return selector === ".key" ? keys : []; },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return {
    context, nodes, keys, store, timerStats,
    run(code) { return vm.runInContext(code, context); },
    getState() { return JSON.parse(store.get("calcRPG") || "{}"); },
    setState(value) { store.set("calcRPG", JSON.stringify(value)); },
    setConfirm(value) { confirmResult = value; },
    setRandom(value) { context.Math.random = () => value; },
  };
}

module.exports = { createHarness };
