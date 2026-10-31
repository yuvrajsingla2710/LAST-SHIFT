export type GameStateMode = 'title' | 'playing' | 'paused' | 'upgrade' | 'gameover';

export type EnemyArchetype = 'swarmer' | 'kiter' | 'charger' | 'turret' | 'boss';

export interface Vector2D {
  x: number;
  y: number;
}

export interface PlayerShip {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  trailingHp: number;
  shield: number;
  maxShield: number;
  speed: number;
  fireCooldown: number;
  fireRate: number; // shots per second
  bulletDamage: number;
  projectileCount: number;
  dashCooldown: number;
  dashMaxCooldown: number;
  dashActiveTimer: number;
  empCooldown: number;
  empMaxCooldown: number;
  syncBeamCooldown: number;
  syncBeamMaxCooldown: number;
  invulnTimer: number;
  hitFlashTimer: number;
  scaleX: number;
  scaleY: number;
  choreThroughputBonus: number;
}

export interface EnemyEntity {
  id: number;
  archetype: EnemyArchetype;
  label: string; // e.g., "SPAM_SWARM", "PHISH_SNIPER", "BLOAT_CHARGER", "ENTROPY_NODE", "DAEMON_OVERLORD"
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  contactDamage: number;
  scoreValue: number;
  xpValue: number;
  aiPhase: 'seek' | 'telegraph' | 'attack' | 'cooldown' | 'ko';
  aiTimer: number;
  telegraphDuration: number;
  targetX: number;
  targetY: number;
  orbitDir: 1 | -1;
  hitFlashTimer: number;
  koTimer: number;
  hasAttackToken: boolean;
}

export interface Projectile {
  active: boolean;
  isPlayer: boolean;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  life: number;
  maxLife: number;
  pierce: number;
}

export interface DataPickup {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  isChoreCore: boolean;
  life: number;
}

export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  drag: number;
}

export interface TacticalUpgrade {
  id: string;
  name: string;
  roleClue: string;
  description: string;
  accent: string;
  apply: (player: PlayerShip) => void;
}

export const TACTICAL_UPGRADES: TacticalUpgrade[] = [
  {
    id: 'multi_thread_cannons',
    name: 'Multi-Thread Volleys',
    roleClue: '+1 Projectile Stream · +15% Fire Rate',
    description: 'Splits primary plasma stream into parallel execution threads and accelerates cycle rate.',
    accent: '#39E7FF',
    apply: (p) => {
      p.projectileCount = Math.min(5, p.projectileCount + 1);
      p.fireRate *= 1.15;
    },
  },
  {
    id: 'overclocked_batcher',
    name: 'Overclocked Batch Engine',
    roleClue: '+35% Weapon Damage · +1 Chore Batch / Trigger',
    description: 'Amplifies bolt impact energy and resolves an extra background chore batch on every sync burst.',
    accent: '#985BFF',
    apply: (p) => {
      p.bulletDamage = Math.round(p.bulletDamage * 1.35);
      p.choreThroughputBonus += 1;
    },
  },
  {
    id: 'reactive_aegis',
    name: 'Reactive Aegis Hull',
    roleClue: '+30 Max Hull & Shield · -25% Dash Cooldown',
    description: 'Reinforces interceptor plating, restores 40 HP immediately, and recharges Phase Dash faster.',
    accent: '#278BFF',
    apply: (p) => {
      p.maxHp += 30;
      p.hp = Math.min(p.maxHp, p.hp + 40);
      p.maxShield += 25;
      p.shield = p.maxShield;
      p.dashMaxCooldown = Math.max(0.8, p.dashMaxCooldown * 0.75);
    },
  },
  {
    id: 'emp_capacitor',
    name: 'Zero-Latency Capacitor',
    roleClue: '-30% EMP & Sync Cooldowns · +18% Ship Speed',
    description: 'Upgrades thruster vectoring and cuts Signal EMP and Sync Beam recharge cycles by 30%.',
    accent: '#10B981',
    apply: (p) => {
      p.empMaxCooldown = Math.max(4.0, p.empMaxCooldown * 0.7);
      p.syncBeamMaxCooldown = Math.max(3.0, p.syncBeamMaxCooldown * 0.7);
      p.speed = Math.round(p.speed * 1.18);
    },
  },
];

export function clampDt(rawDtSeconds: number): number {
  if (!Number.isFinite(rawDtSeconds) || rawDtSeconds < 0) return 0;
  return Math.min(rawDtSeconds, 0.05);
}

export function computeSimDt(rawDtSeconds: number, hitstopTimer: number, timeScale = 1): {
  dt: number;
  simDt: number;
  nextHitstop: number;
} {
  const dt = clampDt(rawDtSeconds);
  if (hitstopTimer > 0) {
    const nextHitstop = Math.max(0, hitstopTimer - dt);
    return { dt, simDt: 0, nextHitstop };
  }
  return { dt, simDt: dt * timeScale, nextHitstop: 0 };
}

export function createInitialPlayer(arenaWidth: number, arenaHeight: number): PlayerShip {
  return {
    x: arenaWidth * 0.5,
    y: arenaHeight * 0.55,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: 18,
    hp: 100,
    maxHp: 100,
    trailingHp: 100,
    shield: 50,
    maxShield: 50,
    speed: 330,
    fireCooldown: 0,
    fireRate: 7.5,
    bulletDamage: 24,
    projectileCount: 2,
    dashCooldown: 0,
    dashMaxCooldown: 2.2,
    dashActiveTimer: 0,
    empCooldown: 0,
    empMaxCooldown: 9.0,
    syncBeamCooldown: 0,
    syncBeamMaxCooldown: 5.5,
    invulnTimer: 1.5, // Spawn protection so game survives initial seconds without input
    hitFlashTimer: 0,
    scaleX: 1,
    scaleY: 1,
    choreThroughputBonus: 0,
  };
}

export function checkCircleCollision(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const rSum = ar + br;
  return dx * dx + dy * dy <= rSum * rSum;
}

export function calculateScoreGain(baseScore: number, comboMultiplier: number): number {
  const mult = Math.max(1, Math.min(12, Math.floor(comboMultiplier)));
  return Math.round(baseScore * mult);
}

export interface PlayerSkillMetrics {
  /** Average projectile hit accuracy in [0, 1] (e.g., 0.75 = 75% accuracy) */
  averageAccuracy?: number;
  /** Time in seconds taken to clear previous waves */
  waveClearTimesSeconds?: number[];
  /** Optional direct average clear time in seconds */
  averageClearTimeSeconds?: number;
}

export interface WaveConfiguration {
  totalEnemies: number;
  spawnInterval: number;
  spawnFrequency: number;
  enemyHealthMultiplier: number;
  skillMultiplier: number;
  skillRating: number;
  difficultyLabel: 'ASSISTED' | 'NOMINAL' | 'OVERCLOCKED' | 'APEX_SIEGE';
  maxConcurrentTokens: number;
  archetypeWeights: Record<EnemyArchetype, number>;
  hasBoss: boolean;
}

export function evaluatePlayerSkillRating(
  wave: number,
  skillMetrics?: PlayerSkillMetrics
): number {
  if (!skillMetrics) return 0;

  let hasAccuracy = false;
  let accuracyScore = 0;
  if (
    typeof skillMetrics.averageAccuracy === 'number' &&
    Number.isFinite(skillMetrics.averageAccuracy)
  ) {
    hasAccuracy = true;
    const clampedAcc = Math.max(0, Math.min(1, skillMetrics.averageAccuracy));
    // Par accuracy is 0.45 (45%); 0.85+ maps to +1.0, 0.05 maps to -1.0
    accuracyScore = Math.max(-1, Math.min(1, (clampedAcc - 0.45) / 0.4));
  }

  let hasClearTime = false;
  let clearSpeedScore = 0;
  const recentTimes =
    skillMetrics.waveClearTimesSeconds && skillMetrics.waveClearTimesSeconds.length > 0
      ? skillMetrics.waveClearTimesSeconds.slice(-3).filter((t) => Number.isFinite(t) && t > 0)
      : [];

  const avgClearTime =
    recentTimes.length > 0
      ? recentTimes.reduce((sum, t) => sum + t, 0) / recentTimes.length
      : typeof skillMetrics.averageClearTimeSeconds === 'number' &&
        Number.isFinite(skillMetrics.averageClearTimeSeconds) &&
        skillMetrics.averageClearTimeSeconds > 0
      ? skillMetrics.averageClearTimeSeconds
      : null;

  if (avgClearTime !== null) {
    hasClearTime = true;
    // Expected par clear time scales mildly with wave index (~18s base)
    const parClearTime = 18 + Math.max(0, wave - 2) * 3;
    // Clearing faster than par yields positive score; slower yields negative score
    clearSpeedScore = Math.max(-1, Math.min(1, (parClearTime - avgClearTime) / 10));
  }

  if (hasAccuracy && hasClearTime) {
    return Math.max(-1, Math.min(1, accuracyScore * 0.55 + clearSpeedScore * 0.45));
  }
  if (hasAccuracy) return accuracyScore;
  if (hasClearTime) return clearSpeedScore;
  return 0;
}

export function getWaveConfiguration(
  wave: number,
  skillMetrics?: PlayerSkillMetrics
): WaveConfiguration {
  const w = Math.max(1, wave);
  const hasBoss = w % 3 === 0;
  const baseWaveScale = 1 + (w - 1) * 0.16;
  const baseSpawnInterval = Math.max(0.45, 1.45 - w * 0.12);

  const skillRating = evaluatePlayerSkillRating(w, skillMetrics);

  // High skill (+1.0) increases enemy HP up to +32% and increases spawn frequency;
  // Low skill (-1.0) reduces enemy HP by up to -28% and slows spawn frequency.
  const skillMultiplier =
    skillRating >= 0 ? 1 + skillRating * 0.32 : 1 + skillRating * 0.28;
  const enemyHealthMultiplier = Number(
    Math.max(0.55, baseWaveScale * skillMultiplier).toFixed(3)
  );

  // Adjust spawnInterval inversely with skillRating (higher skill -> shorter interval -> higher spawn frequency)
  const intervalFactor = skillRating >= 0 ? 1 - skillRating * 0.28 : 1 - skillRating * 0.32;
  const spawnInterval = Number(
    Math.max(0.28, Math.min(2.2, baseSpawnInterval * intervalFactor)).toFixed(3)
  );
  const spawnFrequency = Number((1 / spawnInterval).toFixed(3));

  let difficultyLabel: WaveConfiguration['difficultyLabel'] = 'NOMINAL';
  if (skillRating >= 0.55) difficultyLabel = 'APEX_SIEGE';
  else if (skillRating >= 0.2) difficultyLabel = 'OVERCLOCKED';
  else if (skillRating <= -0.25) difficultyLabel = 'ASSISTED';

  return {
    totalEnemies: 10 + w * 5,
    spawnInterval,
    spawnFrequency,
    enemyHealthMultiplier,
    skillMultiplier: Number(skillMultiplier.toFixed(3)),
    skillRating: Number(skillRating.toFixed(3)),
    difficultyLabel,
    maxConcurrentTokens: Math.min(6, Math.max(2, 2 + Math.floor(w / 2) + (skillRating > 0.5 ? 1 : 0))),
    archetypeWeights: {
      swarmer: 45,
      kiter: w >= 1 ? 25 : 0,
      charger: w >= 1 ? 20 : 0,
      turret: w >= 2 ? 15 : 0,
      boss: hasBoss ? 1 : 0,
    },
    hasBoss,
  };
}

export function spawnEnemyOfArchetype(
  id: number,
  archetype: EnemyArchetype,
  wave: number,
  arenaWidth: number,
  arenaHeight: number,
  spawnEdgeIndex = id % 4,
  customHealthMultiplier?: number
): EnemyEntity {
  const margin = 42;
  let x = arenaWidth * 0.5;
  let y = margin;
  if (spawnEdgeIndex === 0) {
    x = margin + ((id * 173) % Math.max(100, arenaWidth - margin * 2));
    y = margin;
  } else if (spawnEdgeIndex === 1) {
    x = arenaWidth - margin;
    y = margin + ((id * 197) % Math.max(100, arenaHeight - margin * 2));
  } else if (spawnEdgeIndex === 2) {
    x = margin + ((id * 223) % Math.max(100, arenaWidth - margin * 2));
    y = arenaHeight - margin;
  } else {
    x = margin;
    y = margin + ((id * 251) % Math.max(100, arenaHeight - margin * 2));
  }

  const waveScale =
    typeof customHealthMultiplier === 'number' && Number.isFinite(customHealthMultiplier)
      ? Math.max(0.5, customHealthMultiplier)
      : 1 + (wave - 1) * 0.16;

  switch (archetype) {
    case 'swarmer':
      return {
        id,
        archetype: 'swarmer',
        label: 'SPAM_DRONE',
        x,
        y,
        vx: 0,
        vy: 0,
        angle: 0,
        radius: 14,
        hp: Math.round(36 * waveScale),
        maxHp: Math.round(36 * waveScale),
        speed: 145 + wave * 6,
        contactDamage: 9,
        scoreValue: 120,
        xpValue: 18,
        aiPhase: 'seek',
        aiTimer: 0,
        telegraphDuration: 0.3,
        targetX: x,
        targetY: y,
        orbitDir: id % 2 === 0 ? 1 : -1,
        hitFlashTimer: 0,
        koTimer: 0,
        hasAttackToken: false,
      };
    case 'kiter':
      return {
        id,
        archetype: 'kiter',
        label: 'PHISH_VECTOR',
        x,
        y,
        vx: 0,
        vy: 0,
        angle: 0,
        radius: 17,
        hp: Math.round(58 * waveScale),
        maxHp: Math.round(58 * waveScale),
        speed: 125 + wave * 4,
        contactDamage: 10,
        scoreValue: 220,
        xpValue: 28,
        aiPhase: 'seek',
        aiTimer: 1.4,
        telegraphDuration: 0.55,
        targetX: x,
        targetY: y,
        orbitDir: id % 2 === 0 ? 1 : -1,
        hitFlashTimer: 0,
        koTimer: 0,
        hasAttackToken: false,
      };
    case 'charger':
      return {
        id,
        archetype: 'charger',
        label: 'BLOAT_DAEMON',
        x,
        y,
        vx: 0,
        vy: 0,
        angle: 0,
        radius: 21,
        hp: Math.round(92 * waveScale),
        maxHp: Math.round(92 * waveScale),
        speed: 110 + wave * 5,
        contactDamage: 18,
        scoreValue: 310,
        xpValue: 36,
        aiPhase: 'seek',
        aiTimer: 1.8,
        telegraphDuration: 0.6,
        targetX: x,
        targetY: y,
        orbitDir: 1,
        hitFlashTimer: 0,
        koTimer: 0,
        hasAttackToken: false,
      };
    case 'turret':
      return {
        id,
        archetype: 'turret',
        label: 'LINT_OBELISK',
        x,
        y,
        vx: 0,
        vy: 0,
        angle: 0,
        radius: 22,
        hp: Math.round(115 * waveScale),
        maxHp: Math.round(115 * waveScale),
        speed: 70,
        contactDamage: 12,
        scoreValue: 350,
        xpValue: 42,
        aiPhase: 'seek',
        aiTimer: 2.0,
        telegraphDuration: 0.65,
        targetX: arenaWidth * (0.25 + ((id % 3) * 0.25)),
        targetY: arenaHeight * (0.25 + ((id % 2) * 0.45)),
        orbitDir: 1,
        hitFlashTimer: 0,
        koTimer: 0,
        hasAttackToken: false,
      };
    case 'boss':
      return {
        id,
        archetype: 'boss',
        label: 'BACKLOG_LEVIATHAN',
        x: arenaWidth * 0.5,
        y: 90,
        vx: 0,
        vy: 0,
        angle: Math.PI / 2,
        radius: 44,
        hp: Math.round(620 * waveScale),
        maxHp: Math.round(620 * waveScale),
        speed: 88,
        contactDamage: 22,
        scoreValue: 2000,
        xpValue: 180,
        aiPhase: 'seek',
        aiTimer: 2.2,
        telegraphDuration: 0.75,
        targetX: arenaWidth * 0.5,
        targetY: arenaHeight * 0.3,
        orbitDir: 1,
        hitFlashTimer: 0,
        koTimer: 0,
        hasAttackToken: false,
      };
  }
}

/**
 * Updates a single enemy's movement and decision state machine with genuinely distinct policies per archetype:
 * - 'swarmer': Sine-wave weaving flank approach toward the player.
 * - 'kiter': Maintains orbital standoff ring (250..340px); requests an attack token to enter a 0.55s laser-sight telegraph before firing a fast lance shot.
 * - 'charger': Approaches to medium range, requests an attack token, locks target coordinates during a 0.60s telegraph windup, then performs a high-speed linear bull-rush.
 * - 'turret': Navigates toward an arena anchor node and periodically telegraphs & emits radial firewall projectiles.
 * - 'boss': Sweeps across the upper-mid arena while cycling between telegraphed radial bursts and targeted volleys.
 */
export function stepEnemyAI(
  enemy: EnemyEntity,
  player: PlayerShip,
  simDt: number,
  elapsedTime: number,
  tokenPool: { activeTokens: number; maxTokens: number },
  onSpawnEnemyProjectile?: (x: number, y: number, vx: number, vy: number, damage: number, color: string) => void
): void {
  if (enemy.aiPhase === 'ko') {
    enemy.koTimer -= simDt;
    enemy.x += enemy.vx * simDt;
    enemy.y += enemy.vy * simDt;
    enemy.vx *= Math.pow(0.05, simDt);
    enemy.vy *= Math.pow(0.05, simDt);
    enemy.angle += 6.5 * simDt;
    return;
  }

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;

  if (enemy.archetype === 'swarmer') {
    // Policy 1: Sine-wave lateral flank weave
    const perpX = -dirY * enemy.orbitDir;
    const perpY = dirX * enemy.orbitDir;
    const waveOffset = Math.sin(elapsedTime * 5.2 + enemy.id) * 0.55;
    const moveX = dirX + perpX * waveOffset;
    const moveY = dirY + perpY * waveOffset;
    const norm = Math.hypot(moveX, moveY) || 1;
    enemy.vx = (moveX / norm) * enemy.speed;
    enemy.vy = (moveY / norm) * enemy.speed;
    enemy.x += enemy.vx * simDt;
    enemy.y += enemy.vy * simDt;
    enemy.angle = Math.atan2(enemy.vy, enemy.vx);
    return;
  }

  if (enemy.archetype === 'kiter') {
    // Policy 2: Orbital standoff kiter + telegraphed sniper shot
    const preferredDist = 290;
    const radialFactor = (dist - preferredDist) / 140;
    const clampedRadial = Math.max(-0.9, Math.min(0.9, radialFactor));
    const orbitX = -dirY * enemy.orbitDir;
    const orbitY = dirX * enemy.orbitDir;

    if (enemy.aiPhase === 'seek') {
      enemy.vx = (dirX * clampedRadial + orbitX * 0.85) * enemy.speed;
      enemy.vy = (dirY * clampedRadial + orbitY * 0.85) * enemy.speed;
      enemy.x += enemy.vx * simDt;
      enemy.y += enemy.vy * simDt;
      enemy.angle = Math.atan2(dy, dx);
      enemy.aiTimer -= simDt;

      if (enemy.aiTimer <= 0 && dist < 560 && tokenPool.activeTokens < tokenPool.maxTokens) {
        enemy.aiPhase = 'telegraph';
        enemy.aiTimer = enemy.telegraphDuration;
        enemy.targetX = player.x;
        enemy.targetY = player.y;
        enemy.hasAttackToken = true;
        tokenPool.activeTokens += 1;
      }
    } else if (enemy.aiPhase === 'telegraph') {
      enemy.vx *= 0.85;
      enemy.vy *= 0.85;
      enemy.targetX = player.x;
      enemy.targetY = player.y;
      enemy.angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
      enemy.aiTimer -= simDt;
      if (enemy.aiTimer <= 0) {
        enemy.aiPhase = 'attack';
        const shotSpeed = 410;
        const aimAngle = enemy.angle;
        onSpawnEnemyProjectile?.(
          enemy.x + Math.cos(aimAngle) * enemy.radius,
          enemy.y + Math.sin(aimAngle) * enemy.radius,
          Math.cos(aimAngle) * shotSpeed,
          Math.sin(aimAngle) * shotSpeed,
          14,
          '#FF5722'
        );
        if (enemy.hasAttackToken) {
          enemy.hasAttackToken = false;
          tokenPool.activeTokens = Math.max(0, tokenPool.activeTokens - 1);
        }
        enemy.aiPhase = 'seek';
        enemy.aiTimer = 2.4;
      }
    }
    return;
  }

  if (enemy.archetype === 'charger') {
    // Policy 3: Line-of-Sight Charger with windup telegraph -> linear high-speed dash -> recovery
    if (enemy.aiPhase === 'seek') {
      enemy.vx = dirX * enemy.speed;
      enemy.vy = dirY * enemy.speed;
      enemy.x += enemy.vx * simDt;
      enemy.y += enemy.vy * simDt;
      enemy.angle = Math.atan2(dy, dx);
      enemy.aiTimer -= simDt;

      if (enemy.aiTimer <= 0 && dist < 390 && tokenPool.activeTokens < tokenPool.maxTokens) {
        enemy.aiPhase = 'telegraph';
        enemy.aiTimer = enemy.telegraphDuration;
        enemy.targetX = player.x + dirX * 90;
        enemy.targetY = player.y + dirY * 90;
        enemy.angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.hasAttackToken = true;
        tokenPool.activeTokens += 1;
      }
    } else if (enemy.aiPhase === 'telegraph') {
      enemy.aiTimer -= simDt;
      if (enemy.aiTimer <= 0) {
        enemy.aiPhase = 'attack';
        enemy.aiTimer = 0.48;
        const dashSpeed = enemy.speed * 3.4;
        enemy.vx = Math.cos(enemy.angle) * dashSpeed;
        enemy.vy = Math.sin(enemy.angle) * dashSpeed;
      }
    } else if (enemy.aiPhase === 'attack') {
      enemy.x += enemy.vx * simDt;
      enemy.y += enemy.vy * simDt;
      enemy.aiTimer -= simDt;
      if (enemy.aiTimer <= 0) {
        if (enemy.hasAttackToken) {
          enemy.hasAttackToken = false;
          tokenPool.activeTokens = Math.max(0, tokenPool.activeTokens - 1);
        }
        enemy.aiPhase = 'cooldown';
        enemy.aiTimer = 0.85;
      }
    } else if (enemy.aiPhase === 'cooldown') {
      enemy.vx *= 0.88;
      enemy.vy *= 0.88;
      enemy.x += enemy.vx * simDt;
      enemy.y += enemy.vy * simDt;
      enemy.aiTimer -= simDt;
      if (enemy.aiTimer <= 0) {
        enemy.aiPhase = 'seek';
        enemy.aiTimer = 1.9;
      }
    }
    return;
  }

  if (enemy.archetype === 'turret') {
    // Policy 4: Area-denial anchor node that parks at strategic coordinates and pulses 4-way firewall bolts
    const anchorDx = enemy.targetX - enemy.x;
    const anchorDy = enemy.targetY - enemy.y;
    const anchorDist = Math.hypot(anchorDx, anchorDy);
    if (anchorDist > 12) {
      enemy.vx = (anchorDx / anchorDist) * enemy.speed;
      enemy.vy = (anchorDy / anchorDist) * enemy.speed;
      enemy.x += enemy.vx * simDt;
      enemy.y += enemy.vy * simDt;
    } else {
      enemy.vx = 0;
      enemy.vy = 0;
    }
    enemy.angle += 0.9 * simDt;
    enemy.aiTimer -= simDt;

    if (enemy.aiPhase === 'seek' && enemy.aiTimer <= 0 && tokenPool.activeTokens < tokenPool.maxTokens) {
      enemy.aiPhase = 'telegraph';
      enemy.aiTimer = enemy.telegraphDuration;
      enemy.hasAttackToken = true;
      tokenPool.activeTokens += 1;
    } else if (enemy.aiPhase === 'telegraph') {
      if (enemy.aiTimer <= 0) {
        for (let i = 0; i < 4; i++) {
          const a = enemy.angle + (i * Math.PI) / 2;
          onSpawnEnemyProjectile?.(
            enemy.x + Math.cos(a) * enemy.radius,
            enemy.y + Math.sin(a) * enemy.radius,
            Math.cos(a) * 250,
            Math.sin(a) * 250,
            13,
            '#F97316'
          );
        }
        if (enemy.hasAttackToken) {
          enemy.hasAttackToken = false;
          tokenPool.activeTokens = Math.max(0, tokenPool.activeTokens - 1);
        }
        enemy.aiPhase = 'seek';
        enemy.aiTimer = 2.6;
      }
    }
    return;
  }

  if (enemy.archetype === 'boss') {
    // Boss policy: Lateral dreadnought sweep + telegraphed 8-way radial burst
    enemy.x += Math.cos(elapsedTime * 0.9) * enemy.speed * simDt;
    enemy.y += ((140 - enemy.y) * 1.5) * simDt;
    enemy.angle = Math.atan2(dy, dx);
    enemy.aiTimer -= simDt;

    if (enemy.aiPhase === 'seek' && enemy.aiTimer <= 0) {
      enemy.aiPhase = 'telegraph';
      enemy.aiTimer = enemy.telegraphDuration;
    } else if (enemy.aiPhase === 'telegraph' && enemy.aiTimer <= 0) {
      const spokes = 8;
      for (let i = 0; i < spokes; i++) {
        const a = enemy.angle + (i * Math.PI * 2) / spokes;
        onSpawnEnemyProjectile?.(
          enemy.x + Math.cos(a) * enemy.radius,
          enemy.y + Math.sin(a) * enemy.radius,
          Math.cos(a) * 290,
          Math.sin(a) * 290,
          16,
          '#EF4444'
        );
      }
      enemy.aiPhase = 'seek';
      enemy.aiTimer = 2.3;
    }
  }
}

export function applyDamageToPlayer(player: PlayerShip, amount: number): {
  hpLost: number;
  shieldLost: number;
  isDefeated: boolean;
} {
  if (player.invulnTimer > 0 || player.dashActiveTimer > 0 || amount <= 0) {
    return { hpLost: 0, shieldLost: 0, isDefeated: false };
  }

  let remaining = amount;
  let shieldLost = 0;
  if (player.shield > 0) {
    shieldLost = Math.min(player.shield, remaining);
    player.shield -= shieldLost;
    remaining -= shieldLost;
  }

  let hpLost = 0;
  if (remaining > 0) {
    hpLost = Math.min(player.hp, remaining);
    player.hp = Math.max(0, player.hp - remaining);
  }

  player.invulnTimer = 0.55;
  player.hitFlashTimer = 0.12;
  player.scaleX = 1.24;
  player.scaleY = 0.78;

  return {
    hpLost,
    shieldLost,
    isDefeated: player.hp <= 0,
  };
}
