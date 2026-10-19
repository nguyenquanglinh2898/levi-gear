#!/usr/bin/env node
// Durable, tool-neutral checkpoint helper installed with every Codex levi skill.
// It deliberately does not run agents: the Codex skill remains responsible for
// dispatching the right role, while this file makes a stopped run resumable.

import fs from 'node:fs';
import path from 'node:path';

const [command, workDir, ...args] = process.argv.slice(2);
const stateFile = workDir && path.join(workDir, 'run.json');

function die(message) {
  console.error(message);
  process.exitCode = 2;
}

function read() {
  if (!stateFile || !fs.existsSync(stateFile)) throw new Error(`no run state at ${stateFile || '<workdir>'}`);
  return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}

function write(state) {
  fs.mkdirSync(workDir, { recursive: true });
  state.updatedAt = new Date().toISOString();
  const temporary = `${stateFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n');
  try {
    fs.renameSync(temporary, stateFile);
  } catch (error) {
    // Some Windows filesystems do not replace an existing destination on rename.
    // The completed temporary file is still safer than writing JSON in place.
    if (!['EEXIST', 'EPERM'].includes(error.code)) throw error;
    fs.copyFileSync(temporary, stateFile);
    fs.unlinkSync(temporary);
  }
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function stage(state, name) {
  const found = state.stages.find((item) => item.name === name);
  if (!found) throw new Error(`unknown stage "${name}"; expected one of: ${state.stages.map((item) => item.name).join(', ')}`);
  return found;
}

function previousStagesComplete(state, current) {
  const index = state.stages.indexOf(current);
  return state.stages.slice(0, index).every((item) => item.status === 'complete');
}

function record(state, type, details = {}) {
  state.history.push({ at: new Date().toISOString(), type, ...details });
}

function update(commandName, callback) {
  const state = read();
  callback(state);
  write(state);
  print({ command: commandName, state: state.status, currentStage: state.currentStage, file: stateFile });
}

try {
  if (command === 'init') {
    const [usecase, slug, ...stageNames] = args;
    if (!usecase || !slug || !stageNames.length) throw new Error('usage: init <workdir> <usecase> <slug> <stage>...');
    if (new Set(stageNames).size !== stageNames.length) throw new Error('stage names must be unique');
    if (fs.existsSync(stateFile)) throw new Error(`run state already exists at ${stateFile}; use status or resume instead`);
    const now = new Date().toISOString();
    const state = {
      version: 1,
      runtime: 'codex',
      usecase,
      slug,
      status: 'running',
      currentStage: stageNames[0],
      createdAt: now,
      updatedAt: now,
      stages: stageNames.map((name) => ({ name, status: 'pending', attempts: 0, artifacts: [] })),
      history: [{ at: now, type: 'initialized' }],
    };
    write(state);
    print({ command: 'init', state: state.status, currentStage: state.currentStage, file: stateFile });
  } else if (command === 'status') {
    const state = read();
    print({ state: state.status, currentStage: state.currentStage, stages: state.stages, history: state.history, file: stateFile });
  } else if (command === 'begin') {
    const [name] = args;
    update(command, (state) => {
      if (state.status !== 'running') throw new Error(`cannot begin while run is ${state.status}; use resume first`);
      const current = stage(state, name);
      if (state.currentStage !== name) throw new Error(`cannot begin ${name}; current stage is ${state.currentStage}`);
      if (!previousStagesComplete(state, current)) throw new Error(`cannot begin ${name}; an earlier stage is incomplete`);
      if (current.status === 'complete') throw new Error(`${name} is already complete`);
      current.status = 'active';
      current.attempts += 1;
      record(state, 'began', { stage: name, attempt: current.attempts });
    });
  } else if (command === 'complete') {
    const [name, ...artifacts] = args;
    update(command, (state) => {
      if (state.status !== 'running') throw new Error(`cannot complete while run is ${state.status}`);
      const current = stage(state, name);
      if (state.currentStage !== name) throw new Error(`cannot complete ${name}; current stage is ${state.currentStage}`);
      if (!['active', 'pending'].includes(current.status)) throw new Error(`${name} is ${current.status}, not active`);
      const missing = artifacts.filter((artifact) => !fs.existsSync(artifact));
      if (missing.length) throw new Error(`cannot complete ${name}; missing artifact(s): ${missing.join(', ')}`);
      current.status = 'complete';
      current.completedAt = new Date().toISOString();
      current.artifacts = [...new Set([...current.artifacts, ...artifacts])];
      const next = state.stages[state.stages.indexOf(current) + 1];
      state.currentStage = next ? next.name : null;
      state.status = next ? 'running' : 'done';
      record(state, 'completed', { stage: name, artifacts });
    });
  } else if (command === 'finish') {
    const [name, ...artifacts] = args;
    update(command, (state) => {
      const current = stage(state, name);
      if (state.currentStage !== name) throw new Error(`cannot finish at ${name}; current stage is ${state.currentStage}`);
      const missing = artifacts.filter((artifact) => !fs.existsSync(artifact));
      if (missing.length) throw new Error(`cannot finish at ${name}; missing artifact(s): ${missing.join(', ')}`);
      current.status = 'complete';
      current.completedAt = new Date().toISOString();
      current.artifacts = [...new Set([...current.artifacts, ...artifacts])];
      for (const later of state.stages.slice(state.stages.indexOf(current) + 1)) later.status = 'skipped';
      state.currentStage = null;
      state.status = 'done';
      record(state, 'finished', { stage: name, artifacts });
    });
  } else if (command === 'wait' || command === 'block') {
    const [name, ...message] = args;
    update(command, (state) => {
      const current = stage(state, name);
      if (state.currentStage !== name) throw new Error(`cannot mark ${name}; current stage is ${state.currentStage}`);
      current.status = command === 'wait' ? 'waiting_user' : 'blocked';
      current.message = message.join(' ').trim();
      state.status = current.status;
      record(state, command, { stage: name, message: current.message });
    });
  } else if (command === 'resume') {
    update(command, (state) => {
      if (!['waiting_user', 'blocked'].includes(state.status)) throw new Error(`cannot resume while run is ${state.status}`);
      const current = stage(state, state.currentStage);
      current.status = 'active';
      delete current.message;
      state.status = 'running';
      record(state, 'resumed', { stage: current.name });
    });
  } else {
    die('usage: codex-run-state.mjs <init|status|begin|complete|finish|wait|block|resume> <workdir> ...');
  }
} catch (error) {
  die(error.message);
}
