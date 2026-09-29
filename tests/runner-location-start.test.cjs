const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual screen with native boundaries mocked; no device GPS is simulated.
const source = ts.transpileModule(readFileSync('app/run/runner-active.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};
const tick = () => new Promise(setImmediate);

function screen(options = {}) {
  const calls = { starts: 0, stops: 0, records: 0, deleted: [], alerts: [], sent: [], points: [] };
  const cleanups = [];
  const states = [];
  let handler;
  const appState = { currentState: 'active', addEventListener: () => ({ remove() {} }) };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useRef: (value) => ({ current: value }),
    useState: (value) => {
      const state = { value }; states.push(state);
      return [value, (next) => { state.value = typeof next === 'function' ? next(state.value) : next; }];
    },
    useCallback: (fn) => fn,
    useEffect: (fn) => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); },
  };
  const mocks = {
    react,
    'react-native': {
      View: 'View', Text: 'Text', TouchableOpacity: 'Button',
      StyleSheet: { create: (styles) => styles }, Platform: { OS: options.os || 'android' },
      AppState: appState, Alert: { alert: (...args) => calls.alerts.push(args) },
      Linking: { openSettings() {} }, Vibration: { vibrate() {} },
    },
    'react-native-maps': { default: 'Map', Marker: 'Marker', Polyline: 'Polyline' },
    'expo-clipboard': {},
    'expo-location': {
      Accuracy: { BestForNavigation: 6 }, ActivityType: { Fitness: 3 },
      getForegroundPermissionsAsync: async () => ({ status: options.permission || 'granted' }),
      requestForegroundPermissionsAsync: async () => ({ status: options.requested || 'granted', canAskAgain: false }),
      startLocationUpdatesAsync: async (_, config) => {
        calls.starts++; calls.config = config;
        if (options.startGate) await options.startGate.promise;
        if (options.failStart) throw Error('native start failed');
      },
      hasStartedLocationUpdatesAsync: async () => calls.starts > 0 && !options.failStart,
      stopLocationUpdatesAsync: async () => { calls.stops++; },
      // Background permission APIs intentionally absent: calling them must fail the test.
    },
    'expo-secure-store': { getItemAsync: async () => '1' },
    'expo-router': { useLocalSearchParams: () => ({ groupId: 'g', runnerId: 'r' }), useNavigation: () => ({ setOptions() {} }), router: {} },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../../src/constants/theme': { Colors: {}, FontSize: {}, Spacing: {}, Radius: {} },
    '../../src/hooks/useRunnerSocket': { useRunnerSocket: () => ({ sendLocation: (p) => calls.sent.push(p), otherRunners: new Map() }) },
    '../../src/hooks/useLockScreenActivity': { useRunnerLockScreen() {} },
    '../../src/components/RunnerListPanel': {},
    '../../src/services/backgroundLocation': { RUN_LOCATION_TASK: 'run', setLocationHandler: (fn) => { handler = fn; } },
    '../../src/services/runRecordStore': {
      createRun: async () => { calls.records++; if (options.recordGate) await options.recordGate.promise; if (options.failRecord) throw Error('db failed'); return 42; },
      deleteRun: async (id) => { calls.deleted.push(id); },
      appendPoint: async (...args) => { calls.points.push(args); },
    },
    '../../src/services/runSync': {}, './_layout': {},
    '../../src/components/LocationDisclosureModal': { LocationDisclosureModal: 'Disclosure' },
    '../../src/components/BatteryOptimizationGuideModal': {},
  };
  const context = {
    exports: {}, require: (name) => { assert.ok(name in mocks, name); return mocks[name]; },
    console: { warn() {} }, setInterval: () => 1, clearInterval() {}, setTimeout, clearTimeout,
  };
  vm.runInNewContext(source, context);
  const tree = context.exports.default();
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    return (node.children || []).flat(Infinity).map((child) => find(child, predicate)).find(Boolean);
  };
  const start = find(tree, (n) => n.type === 'Button' && n.props.accessibilityState?.busy === false).props.onPress;
  const disclosure = find(tree, (n) => n.type === 'Disclosure').props;
  return { calls, start, disclosure, appState, running: () => states.some((s) => s.value === 'running'), unmount: () => cleanups.forEach((fn) => fn()), location: (point) => handler?.([point]) };
}

for (const os of ['android', 'ios']) {
  test(`${os}: when-in-use starts tracking and forwards location after app backgrounding`, async () => {
    const s = screen({ os });
    await s.start();
    assert.equal(s.calls.starts, 1);
    assert.equal(s.running(), true);
    assert.ok(s.calls.config.foregroundService);
    assert.equal(s.calls.config.showsBackgroundLocationIndicator, true);
    s.appState.currentState = 'background';
    s.location({ coords: { latitude: 37, longitude: 127, accuracy: 5 } });
    assert.equal(s.calls.sent.length, 1);
    assert.equal(s.calls.points.length, 1);
    s.unmount(); await tick();
    assert.equal(s.calls.stops, 1);
  });
}
test('duplicate presses share one native start', async () => {
  const gate = deferred(); const s = screen({ startGate: gate });
  const first = s.start(); await tick(); await s.start(); gate.resolve(); await first;
  assert.equal(s.calls.starts, 1); assert.equal(s.calls.records, 1);
});
test('native failure leaves no record and permits retry', async () => {
  const options = { failStart: true }; const s = screen(options);
  await s.start(); assert.equal(s.running(), false); assert.equal(s.calls.records, 0);
  options.failStart = false; await s.start(); assert.equal(s.running(), true);
});
test('record failure stops the service', async () => {
  const s = screen({ failRecord: true }); await s.start();
  assert.equal(s.running(), false); assert.equal(s.calls.stops, 1);
});
test('leaving during native start stops the late service without creating a record', async () => {
  const gate = deferred(); const s = screen({ startGate: gate });
  const pending = s.start(); await tick(); s.unmount(); gate.resolve(); await pending;
  assert.equal(s.calls.stops, 1); assert.equal(s.calls.records, 0); assert.equal(s.running(), false);
});
test('leaving during record creation removes the unstarted record', async () => {
  const gate = deferred(); const s = screen({ recordGate: gate });
  const pending = s.start(); await tick(); s.unmount(); gate.resolve(); await pending;
  assert.deepEqual(s.calls.deleted, [42]); assert.equal(s.calls.stops, 1); assert.equal(s.running(), false);
});
test('denied permission never starts tracking', async () => {
  const s = screen({ permission: 'denied', requested: 'denied' });
  const pending = s.start(); await tick(); s.disclosure.onAccept(); await pending;
  assert.equal(s.calls.starts, 0); assert.equal(s.calls.records, 0);
});
test('leaving the disclosure cancels startup', async () => {
  const s = screen({ permission: 'denied' });
  const pending = s.start(); await tick(); s.unmount(); await pending;
  assert.equal(s.calls.starts, 0);
});
test('backgrounded app cannot initiate tracking', async () => {
  const s = screen(); s.appState.currentState = 'background'; await s.start();
  assert.equal(s.calls.starts, 0); assert.equal(s.calls.records, 0);
});
