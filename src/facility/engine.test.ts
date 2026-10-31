import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeArchiveFiles,
  analyzeCodeSnippetForLint,
  classifyEmailDeterministic,
  createInitialFacilitySaveState,
  createInitialSampleArchiveFiles,
  createInitialSampleEmails,
  findFocusedInteractiveObject,
  generateEmailOperationProposals,
  getFacilityInteractiveObjects,
  isWalkableFacilityPosition,
  parseAndAnalyzeCsvExpenses,
  parseRawEmlContent,
  SAMPLE_FINANCE_CSV,
  SAMPLE_REPAIR_CODE_MODULE,
} from './engine';

test('parseRawEmlContent and classifyEmailDeterministic strictly separate Commercial from Promotional, Invoices, Newsletters, and Phishing', () => {
  const samples = createInitialSampleEmails();
  assert.equal(samples.length, 8);

  const byFile = Object.fromEntries(samples.map((e) => [e.sourceFileName, e]));

  // 1. Commercial B2B SOW Proposal
  const comm = byFile['sample_01_aegis_turbine_proposal.eml'];
  assert.equal(comm.category, 'Commercial / Business');
  assert.ok(comm.extractedDatesAndDeadlines.includes('2095-11-24'));
  assert.equal(comm.extractedAmounts.length, 0); // No invented payment amount!

  // 2. Promotional Retail Discount Blast
  const promo = byFile['sample_02_neonmart_flash_sale.eml'];
  assert.equal(promo.category, 'Promotional / Marketing');
  assert.equal(promo.recommendedAction, 'Archive');

  // 3. Supplier Invoice
  const inv = byFile['sample_03_helios_power_invoice.eml'];
  assert.equal(inv.category, 'Invoices and Receipts');
  assert.ok(inv.extractedAmounts.includes('$4,850.00'));
  assert.ok(inv.extractedDatesAndDeadlines.includes('2095-11-30'));

  // 4. Weekly Newsletter
  const news = byFile['sample_04_orbital_tech_newsletter.eml'];
  assert.equal(news.category, 'Newsletters');

  // 5. Credential Phishing
  const phish = byFile['sample_05_spoofed_credential_phish.eml'];
  assert.equal(phish.category, 'Suspicious / Possible phishing');
  assert.equal(phish.priority, 'Critical');

  // 6. Important Directive
  const imp = byFile['sample_06_directorate_blackout_directive.eml'];
  assert.equal(imp.category, 'Important');

  // 7. Personal Note
  const personal = byFile['sample_07_sister_personal_note.eml'];
  assert.equal(personal.category, 'Personal');

  // 8. Unfamiliar sender without spam signals defaults to Unclassified (never auto-spammed)
  const unfamiliarRaw = `From: "Dr. Aris Thorne" <athorne@independent-research.org>\nTo: operator07@facility07.org\nSubject: Inquiry regarding atmospheric sensor calibration\nDate: Fri, 16 Nov 2095 10:00:00 +0000\n\nHello, could you share the baseline barometer offset used in Sector 07?`;
  const unfamiliarParsed = classifyEmailDeterministic(
    parseRawEmlContent(unfamiliarRaw, 'unfamiliar.eml', false)
  );
  assert.equal(unfamiliarParsed.category, 'Unclassified');
  assert.equal(unfamiliarParsed.recommendedAction, 'Keep in Active Inbox');
});

test('generateEmailOperationProposals builds accurate batch proposals from classified emails', () => {
  const samples = createInitialSampleEmails();
  const proposals = generateEmailOperationProposals(samples);
  assert.ok(proposals.length >= 4);
  const promoProp = proposals.find((p) => p.id === 'prop_archive_promos');
  assert.ok(promoProp);
  assert.equal(promoProp.affectedEmailIds.length, 1);
});

test('analyzeArchiveFiles detects exact SHA-256 duplicates vs same-name revisions and preserves large videos', () => {
  const files = createInitialSampleArchiveFiles();
  assert.equal(files.length, 7);

  // Second file has identical content to first file -> exact_hash_duplicate
  assert.equal(files[0].duplicateStatus, 'unique');
  assert.equal(files[1].duplicateStatus, 'exact_hash_duplicate');
  assert.equal(files[1].duplicateOfFileName, 'Helios_Grid_Invoice_INV-2095-4410.txt');
  assert.equal(files[1].recommendedAction, 'Quarantine Duplicate');

  // Files 2 and 3 share the same filename "Substation_Turbine_Schematic_v2.md" but have different content
  assert.equal(files[2].duplicateStatus, 'unique');
  assert.equal(files[3].duplicateStatus, 'same_name_collision');
  assert.equal(files[3].recommendedAction, 'Hold for Manual Review');

  // Large 48.5MB video is routed to Videos, NOT flagged as junk
  const videoFile = files.find((f) => f.extension === 'mp4');
  assert.ok(videoFile);
  assert.equal(videoFile.suggestedFolder, 'Videos');
  assert.equal(videoFile.recommendedAction, 'Move to Suggested Folder');
});

test('parseAndAnalyzeCsvExpenses flags duplicate vendor+date+amount charges and high-value anomalies', () => {
  const txs = parseAndAnalyzeCsvExpenses(SAMPLE_FINANCE_CSV);
  assert.equal(txs.length, 6);
  assert.equal(txs[0].isDuplicate, false);
  assert.equal(txs[1].isDuplicate, true);
  assert.equal(txs[1].duplicateOfId, 'tx_1');
  assert.equal(txs[5].isUnusual, true);
  assert.equal(txs[5].recommendedAction, 'Audit Anomaly');
});

test('analyzeCodeSnippetForLint identifies genuine lint errors and provides before/after diffs', () => {
  const diags = analyzeCodeSnippetForLint(SAMPLE_REPAIR_CODE_MODULE);
  assert.equal(diags.length, 4);
  const rules = diags.map((d) => d.ruleId);
  assert.ok(rules.includes('@typescript-eslint/no-explicit-any'));
  assert.ok(rules.includes('no-var'));
  assert.ok(rules.includes('eqeqeq'));
  assert.ok(rules.includes('@typescript-eslint/no-floating-promises'));
});

test('3D facility collision and interactive raycast resolution enforce door locks and look vectors', () => {
  const state = createInitialFacilitySaveState();

  // Player starts at (0, 23.5) inside Maintenance Bay 01 -> walkable
  assert.equal(isWalkableFacilityPosition(0, 23.5, state.doorsOpen), true);

  // Doorway between Maintenance Bay and Generator Room at (0, 18.0) is blocked when door_maint_gen is closed
  assert.equal(isWalkableFacilityPosition(0, 18.0, state.doorsOpen), false);

  // Open door_maint_gen -> now doorway at (0, 18.0) is walkable!
  state.doorsOpen.door_maint_gen = true;
  assert.equal(isWalkableFacilityPosition(0, 18.0, state.doorsOpen), true);

  // Raycast toward door_maint_gen from (0, 1.7, 20.5) looking North (0, 0, -1)
  const objects = getFacilityInteractiveObjects(state);
  const focused = findFocusedInteractiveObject([0, 1.7, 20.5], [0, 0, -1], objects);
  assert.ok(focused);
  assert.equal(focused.id, 'door_maint_gen');
});

import {
  createCsrfStateToken,
  decryptTokenAes256Gcm,
  encryptTokenAes256Gcm,
  generatePkcePair,
  parseGmailApiMessageToParsedEmail,
  verifyCsrfStateToken,
} from './security';

test('AES-256-GCM token vault encrypts and decrypts OAuth tokens and rejects tampered ciphertext', () => {
  const secret = 'unit-test-token-encryption-key-2096';
  const rawToken = 'ya29.a0AfH6SMBx-real-gmail-readonly-access-token';
  const encrypted = encryptTokenAes256Gcm(rawToken, secret);

  assert.equal(encrypted.algorithm, 'aes-256-gcm');
  assert.notEqual(encrypted.cipherTextB64, rawToken);
  const decrypted = decryptTokenAes256Gcm(encrypted, secret);
  assert.equal(decrypted, rawToken);

  // Tamper with auth tag -> must throw an authentication failure error
  const tampered = {
    ...encrypted,
    authTagB64: Buffer.alloc(16, 0).toString('base64'),
  };
  assert.throws(() => decryptTokenAes256Gcm(tampered, secret));
});

test('CSRF HMAC state token and PKCE S256 generator validate legitimate flows and reject invalid states', () => {
  const sessionSecret = 'unit-test-session-secret-key';
  const state = createCsrfStateToken(sessionSecret);
  assert.equal(verifyCsrfStateToken(state, sessionSecret), true);
  assert.equal(verifyCsrfStateToken(`${state}tampered`, sessionSecret), false);
  assert.equal(verifyCsrfStateToken('invalid_state_token', sessionSecret), false);

  const pkce = generatePkcePair();
  assert.ok(pkce.codeVerifier.length >= 32);
  assert.ok(pkce.codeChallenge.length >= 32);
  assert.notEqual(pkce.codeVerifier, pkce.codeChallenge);
});

test('parseGmailApiMessageToParsedEmail converts real Gmail API message payloads and classifies them accurately', () => {
  const bodyText =
    'Invoice #INV-2096-8821 from Helios Grid Services. Total amount due: $1,240.00 by 2096-12-15.';
  const base64UrlBody = Buffer.from(bodyText, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const parsed = parseGmailApiMessageToParsedEmail(
    {
      id: '19384a7b2c1d',
      threadId: '19384a7b2c1d',
      snippet: bodyText,
      labelIds: ['INBOX', 'UNREAD'],
      payload: {
        headers: [
          { name: 'From', value: 'Billing <billing@heliosgrid.io>' },
          { name: 'To', value: 'operator@facility07.org' },
          { name: 'Subject', value: 'Invoice #INV-2096-8821 Due 2096-12-15' },
          { name: 'Date', value: 'Mon, 01 Dec 2096 09:30:00 +0000' },
        ],
        mimeType: 'text/plain',
        body: { data: base64UrlBody },
      },
    },
    0
  );

  assert.equal(parsed.isSample, false);
  assert.equal(parsed.category, 'Invoices and Receipts');
  assert.ok(parsed.extractedAmounts.includes('$1,240.00'));
  assert.ok(parsed.extractedDatesAndDeadlines.includes('2096-12-15'));
});
