import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioCapture } from '../src/services/mediaCapture.ts';

function makeStream() {
  const tracks = [{ stopped: 0, stop() { this.stopped += 1; } }];
  return { tracks, stream: { getTracks: () => tracks } };
}

function makeRecorderClass({ supported = ['audio/webm;codecs=opus'], constructorError, startError, finalChunk } = {}) {
  const instances = [];
  class FakeRecorder {
    static isTypeSupported(type) { return supported.includes(type); }
    constructor(stream, init) {
      if (constructorError && init?.mimeType) throw constructorError;
      this.stream = stream;
      this.options = init;
      this.mimeType = init?.mimeType ?? 'audio/mock';
      this.state = 'inactive';
      this.ondataavailable = null;
      this.onstop = null;
      this.onerror = null;
      this.stopCalls = 0;
      instances.push(this);
    }
    start() {
      if (startError) throw startError;
      this.state = 'recording';
    }
    stop() {
      this.stopCalls += 1;
      this.state = 'inactive';
      if (finalChunk) this.emit(finalChunk);
      this.onstop?.(new Event('stop'));
    }
    emit(value, type = this.mimeType) {
      this.ondataavailable?.({ data: new Blob([value], { type }) });
    }
    error() { this.onerror?.(new Event('error')); }
  }
  return { FakeRecorder, instances };
}

function makeTimers() {
  let next = 0;
  const callbacks = new Map();
  return {
    callbacks,
    setTimeout(callback, delay) { const id = ++next; callbacks.set(id, { callback, delay }); return id; },
    clearTimeout(id) { callbacks.delete(id); },
    fire(id = [...callbacks.keys()][0]) { const timer = callbacks.get(id); if (!timer) return; callbacks.delete(id); timer.callback(); },
  };
}

test('explicit start captures exact encoded chunks and saves once on stop', async () => {
  const { stream, tracks } = makeStream();
  const { FakeRecorder, instances } = makeRecorderClass({ finalChunk: 'tail' });
  const timers = makeTimers();
  const states = [];
  const captures = [];
  let time = 10;
  const getUserMedia = async (constraints) => { assert.deepEqual(constraints, { audio: true }); return stream; };
  const controller = createAudioCapture({
    getUserMedia, MediaRecorder: FakeRecorder, now: () => time,
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
    onState: (status) => states.push(status),
    onCaptured: (blob, metadata) => captures.push({ blob, metadata }),
  });

  assert.equal(controller.getState(), 'idle');
  assert.equal(instances.length, 0);
  await controller.start();
  assert.equal(controller.getState(), 'recording');
  assert.equal(instances[0].options.mimeType, 'audio/webm;codecs=opus');
  instances[0].emit('first');
  instances[0].emit('-second');
  time = 825;
  controller.stop();
  controller.stop();

  assert.equal(controller.getState(), 'captured');
  assert.equal(captures.length, 1);
  assert.equal(await captures[0].blob.text(), 'first-secondtail');
  assert.deepEqual(captures[0].metadata, { durationMs: 815, mimeType: 'audio/webm;codecs=opus' });
  assert.equal(tracks[0].stopped, 1);
  assert.equal(timers.callbacks.size, 0);
  assert.deepEqual(states.map(({ state }) => state), ['requesting', 'recording', 'stopping', 'captured']);
});

test('cancel during a delayed permission request closes its eventual stream and ignores late results', async () => {
  const deferred = {};
  const { FakeRecorder, instances } = makeRecorderClass();
  const captures = [];
  let requests = 0;
  const controller = createAudioCapture({
    getUserMedia: () => { requests += 1; return new Promise((resolve) => { deferred.resolve = resolve; }); },
    MediaRecorder: FakeRecorder, onCaptured: (...args) => captures.push(args),
  });
  const pending = controller.start();
  assert.equal(requests, 1);
  controller.cancel();
  const late = makeStream();
  deferred.resolve(late.stream);
  await pending;
  assert.equal(controller.getState(), 'cancelled');
  assert.equal(instances.length, 0);
  assert.equal(late.tracks[0].stopped, 1);
  assert.equal(captures.length, 0);
});

test('cancel while recording stops tracks, clears timers and drops bytes even if recorder later emits stop', async () => {
  const { stream, tracks } = makeStream();
  const { FakeRecorder, instances } = makeRecorderClass({ finalChunk: 'must drop' });
  const timers = makeTimers();
  const captures = [];
  const controller = createAudioCapture({
    getUserMedia: async () => stream, MediaRecorder: FakeRecorder,
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
    onCaptured: (...args) => captures.push(args),
  });
  await controller.start();
  const recorder = instances[0];
  recorder.emit('before cancel');
  controller.cancel();
  recorder.emit('late');
  recorder.onstop?.(new Event('stop'));
  assert.equal(controller.getState(), 'cancelled');
  assert.equal(recorder.stopCalls, 1);
  assert.equal(tracks[0].stopped, 1);
  assert.equal(timers.callbacks.size, 0);
  assert.equal(captures.length, 0);
});

test('denied permission exposes actionable content-free status', async () => {
  const states = [];
  const controller = createAudioCapture({
    getUserMedia: async () => { throw Object.assign(new Error('private device diagnostic'), { name: 'NotAllowedError' }); },
    onState: (status) => states.push(status),
  });
  await controller.start();
  assert.equal(controller.getState(), 'error');
  assert.match(states.at(-1).message, /Allow microphone access/);
  assert.doesNotMatch(states.at(-1).message, /private device diagnostic|NotAllowedError/);
});

test('recorder errors discard partial bytes and release microphone', async () => {
  const { stream, tracks } = makeStream();
  const { FakeRecorder, instances } = makeRecorderClass();
  const captures = [];
  const states = [];
  const controller = createAudioCapture({ getUserMedia: async () => stream, MediaRecorder: FakeRecorder,
    onState: (status) => states.push(status), onCaptured: (...args) => captures.push(args) });
  await controller.start();
  instances[0].emit('partial');
  instances[0].error();
  instances[0].onstop?.(new Event('stop'));
  assert.equal(controller.getState(), 'error');
  assert.match(states.at(-1).message, /browser error/);
  assert.equal(tracks[0].stopped, 1);
  assert.equal(captures.length, 0);
});

test('unsupported MIME negotiation falls back to the platform default constructor', async () => {
  const { stream } = makeStream();
  const { FakeRecorder, instances } = makeRecorderClass({ supported: [] });
  const captures = [];
  const controller = createAudioCapture({ getUserMedia: async () => stream, MediaRecorder: FakeRecorder,
    onCaptured: (blob, metadata) => captures.push({ blob, metadata }) });
  await controller.start();
  assert.equal(instances[0].options, undefined);
  instances[0].emit('fallback audio', 'audio/mock');
  controller.stop();
  assert.equal(await captures[0].blob.text(), 'fallback audio');
  assert.equal(captures[0].metadata.mimeType, 'audio/mock');
});

test('size cap discards an over-limit recording without saving a partial file', async () => {
  const { stream, tracks } = makeStream();
  const { FakeRecorder, instances } = makeRecorderClass();
  const timers = makeTimers();
  const captures = [];
  const states = [];
  const controller = createAudioCapture({ getUserMedia: async () => stream, MediaRecorder: FakeRecorder,
    maxBytes: 3, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
    onState: (status) => states.push(status), onCaptured: (...args) => captures.push(args) });
  await controller.start();
  instances[0].emit('four');
  assert.equal(controller.getState(), 'error');
  assert.match(states.at(-1).message, /size limit/);
  assert.equal(tracks[0].stopped, 1);
  assert.equal(timers.callbacks.size, 0);
  assert.equal(captures.length, 0);
});

test('scheduled 60 second stop saves complete bytes and reports actual elapsed time if the timer is delayed', async () => {
  const { stream } = makeStream();
  const { FakeRecorder, instances } = makeRecorderClass({ finalChunk: 'ending' });
  const timers = makeTimers();
  const captures = [];
  let time = 100;
  const controller = createAudioCapture({ getUserMedia: async () => stream, MediaRecorder: FakeRecorder,
    now: () => time, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
    onCaptured: (blob, metadata) => captures.push({ blob, metadata }) });
  await controller.start();
  instances[0].emit('begin');
  assert.equal([...timers.callbacks.values()][0].delay, 60_000);
  time = 65_200;
  timers.fire();
  assert.equal(controller.getState(), 'captured');
  assert.equal(await captures[0].blob.text(), 'beginending');
  assert.equal(captures[0].metadata.durationMs, 65_100);
  assert.equal(captures[0].metadata.mimeType, 'audio/webm;codecs=opus');
});

test('double start is ignored while busy and a canceled controller can start again', async () => {
  const streams = [makeStream(), makeStream()];
  const { FakeRecorder, instances } = makeRecorderClass();
  let requests = 0;
  const controller = createAudioCapture({ getUserMedia: async () => streams[requests++].stream, MediaRecorder: FakeRecorder });
  await Promise.all([controller.start(), controller.start()]);
  assert.equal(requests, 1);
  await controller.start();
  assert.equal(instances.length, 1);
  controller.cancel();
  await controller.start();
  assert.equal(requests, 2);
  assert.equal(instances.length, 2);
  assert.equal(streams[0].tracks[0].stopped, 1);
  controller.cancel();
  assert.equal(streams[1].tracks[0].stopped, 1);
});

test('cancel before permission resolves prevents a stale earlier operation from winning a later start', async () => {
  const resolvers = [];
  const streams = [makeStream(), makeStream()];
  const { FakeRecorder, instances } = makeRecorderClass();
  const controller = createAudioCapture({
    getUserMedia: () => new Promise((resolve) => resolvers.push(resolve)),
    MediaRecorder: FakeRecorder,
  });
  const first = controller.start();
  controller.cancel();
  const second = controller.start();
  resolvers[1](streams[1].stream);
  await second;
  resolvers[0](streams[0].stream);
  await first;
  assert.equal(controller.getState(), 'recording');
  assert.equal(instances.length, 1);
  assert.equal(streams[0].tracks[0].stopped, 1);
  assert.equal(streams[1].tracks[0].stopped, 0);
  controller.cancel();
});

