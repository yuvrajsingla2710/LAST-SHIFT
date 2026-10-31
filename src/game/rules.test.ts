import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDt,
  computeSimDt,
  createInitialPlayer,
  checkCircleCollision,
  calculateScoreGain,
  getWaveConfiguration,
  spawnEnemyOfArchetype,
  stepEnemyAI,
  applyDamageToPlayer,
  TACTICAL_UPGRADES,
} from './rules';
import {
  createInitialChoreState,
  executeChoreBatchInState,
  addCustomChoreToState,
} from './chores';

test('clampDt caps frame delta at 0.05s and handles negative/NaN inputs', () => {
  assert.equal(clampDt(0.016), 0.016);
  assert.equal(clampDt(0.25), 0.05);
  assert.equal(clampDt(-1), 0);
  assert.equal(clampDt(Number.NaN), 0);
});

test('computeSimDt freezes simulation during hitstop while decrementing hitstop timer', () => {
  const step1 = computeSimDt(0.02, 0.05, 1);
  assert.equal(step1.dt, 0.02);
  assert.equal(step1.simDt, 0);
  assert.ok(Math.abs(step1.nextHitstop - 0.03) < 1e-6);

  const step2 = computeSimDt(0.02, 0, 1);
  assert.equal(step2.simDt, 0.02);
  assert.equal(step2.nextHitstop, 0);
});

test('distinct enemy archetypes exhibit genuinely different movement policies', () => {
  const player = createInitialPlayer(1440, 900);
  const swarmer = spawnEnemyOfArchetype(1, 'swarmer', 1, 1440, 900, 0);
  const kiter = spawnEnemyOfArchetype(2, 'kiter', 1, 1440, 900, 0);
  const charger = spawnEnemyOfArchetype(3, 'charger', 1, 1440, 900, 0);

  // Place all three at identical starting position near player
  swarmer.x = kiter.x = charger.x = player.x - 240;
  swarmer.y = kiter.y = charger.y = player.y;

  const tokenPool = { activeTokens: 0, maxTokens: 3 };
  stepEnemyAI(swarmer, player, 0.04, 1.2, tokenPool);
  stepEnemyAI(kiter, player, 0.04, 1.2, tokenPool);

  charger.aiTimer = 0; // Ready to telegraph charge
  stepEnemyAI(charger, player, 0.04, 1.2, tokenPool);

  assert.equal(charger.aiPhase, 'telegraph');
  assert.equal(tokenPool.activeTokens, 1);
  // Kiter orbits/backs off when inside preferred standoff distance (240 < 290)
  assert.ok(kiter.vx < swarmer.vx, 'Kiter should back off / orbit differently from Swarmer');
});

test('applyDamageToPlayer depletes shield first, then hull, and triggers defeat at 0 HP', () => {
  const player = createInitialPlayer(1440, 900);
  player.invulnTimer = 0; // Clear spawn invulnerability for test

  const hit1 = applyDamageToPlayer(player, 30);
  assert.equal(hit1.shieldLost, 30);
  assert.equal(hit1.hpLost, 0);
  assert.equal(player.shield, 20);
  assert.equal(player.hp, 100);

  player.invulnTimer = 0;
  const hit2 = applyDamageToPlayer(player, 120);
  assert.equal(hit2.shieldLost, 20);
  assert.equal(hit2.hpLost, 100);
  assert.equal(player.hp, 0);
  assert.equal(hit2.isDefeated, true);
});

test('chore engine executes pending batches, records logs, and validates custom tasks', () => {
  const state = createInitialChoreState();
  assert.equal(state.queues.emails.items.length, 12);

  const res = executeChoreBatchInState(state, {
    categoryId: 'emails',
    triggerSource: 'kill',
    intensity: 2,
  });

  assert.equal(res.resolvedItems.length, 2);
  assert.equal(state.totals.batchesResolved, 2);
  assert.ok(state.totals.unitsResolved > 0);
  assert.equal(state.logs.length, 2);

  const added = addCustomChoreToState(state, {
    categoryId: 'lint',
    title: 'src/App.tsx strict check',
    sourceDetail: 'ESLint',
    targetAction: 'Fix unused state bindings',
    units: 8,
  });
  assert.equal(added.units, 8);
  assert.throws(() =>
    addCustomChoreToState(state, {
      categoryId: 'lint',
      title: '   ',
      sourceDetail: '',
      targetAction: '',
      units: 0,
    })
  );
});

test('circle collision and score multiplier math work accurately', () => {
  assert.equal(checkCircleCollision(100, 100, 15, 120, 100, 10), true);
  assert.equal(checkCircleCollision(100, 100, 10, 150, 100, 10), false);
  assert.equal(calculateScoreGain(100, 4), 400);
  assert.equal(TACTICAL_UPGRADES.length, 4);
});

test('getWaveConfiguration dynamically scales enemy health and spawn frequency from accuracy and clear times', () => {
  const baseline = getWaveConfiguration(2);

  const highSkill = getWaveConfiguration(2, {
    averageAccuracy: 0.88,
    waveClearTimesSeconds: [10.5, 11.2],
  });

  const lowSkill = getWaveConfiguration(2, {
    averageAccuracy: 0.15,
    waveClearTimesSeconds: [31.0, 29.5],
  });

  // High skill player faces higher enemy health multiplier and higher spawn frequency (shorter interval)
  assert.ok(
    highSkill.enemyHealthMultiplier > baseline.enemyHealthMultiplier,
    'High skill should increase enemyHealthMultiplier above baseline'
  );
  assert.ok(
    highSkill.spawnFrequency > baseline.spawnFrequency,
    'High skill should increase spawnFrequency above baseline'
  );
  assert.ok(
    highSkill.spawnInterval < baseline.spawnInterval,
    'High skill should decrease spawnInterval below baseline'
  );
  assert.equal(highSkill.difficultyLabel, 'APEX_SIEGE');

  // Low skill player gets reduced enemy health multiplier and lower spawn frequency (longer interval)
  assert.ok(
    lowSkill.enemyHealthMultiplier < baseline.enemyHealthMultiplier,
    'Low skill should decrease enemyHealthMultiplier below baseline'
  );
  assert.ok(
    lowSkill.spawnFrequency < baseline.spawnFrequency,
    'Low skill should decrease spawnFrequency below baseline'
  );
  assert.ok(
    lowSkill.spawnInterval > baseline.spawnInterval,
    'Low skill should increase spawnInterval above baseline'
  );
  assert.equal(lowSkill.difficultyLabel, 'ASSISTED');

  // Verify spawnEnemyOfArchetype applies the dynamic enemyHealthMultiplier to spawned enemy HP
  const eliteEnemy = spawnEnemyOfArchetype(
    10,
    'charger',
    2,
    1440,
    900,
    0,
    highSkill.enemyHealthMultiplier
  );
  const assistedEnemy = spawnEnemyOfArchetype(
    11,
    'charger',
    2,
    1440,
    900,
    0,
    lowSkill.enemyHealthMultiplier
  );
  assert.ok(eliteEnemy.maxHp > assistedEnemy.maxHp);
});
