"use strict";
// ============================== THE CASEWORK ==============================
// Two complete matters, one per path, each running intake -> investigation ->
// resolution entirely on the engine's data vocabulary. Nothing here is special-
// cased in the loop; if these work, the fifth district's cases are typing.
//
//   THE STREET  Ruiz v. Golden Wok   — your first client wants to sue your
//                                      landlord. Facts decide what you can
//                                      honestly do about that.
//   THE FLOOR   In re: The Unsent    — whose resignation letter is this, and
//                                      what does filing one actually take.

import { defineFacts, learn, knows, knowsAny } from '../engine/facts.js';
import { defineQuests, qResolve, isActive, isDone, isFailed as isFailedCase, started, outcomeOf, currentStage } from '../engine/quests.js';

/* ================================ FACTS ================================ */

defineFacts([
  // ---- Ruiz v. Golden Wok ----
  { id: 'ruiz_ceiling', case: 'ruiz', text: 'Marisol Ruiz has had cooking grease coming through her ceiling since March.' },
  { id: 'ruiz_asked', case: 'ruiz', text: 'She asked the Golden Wok to fix it four times. Twice in writing.' },
  { id: 'wok_notice', case: 'ruiz', text: 'A health-department notice was posted on the corkboard — and taken down early.' },
  { id: 'wok_inspection', case: 'ruiz', text: 'Hector saw the county inspector go in twice in one week, and leave faster the second time.' },
  { id: 'wok_landlord', case: 'ruiz', text: 'Your own lease names GOLDEN WOK HOLDINGS LLC as landlord. Ruiz\'s defendant is your landlord.' },
  { id: 'wok_insured', case: 'ruiz', text: 'The Wok carries a general liability policy. There is money behind this, which is not the same as there being justice.' },

  // ---- In re: The Unsent ----
  // ---- The Coronado Notice ----
  { id: 'coronado_deadline', case: 'coronado', text: 'Delgado was served on the 28th. The answer is due at the filing window, and the window does not care why it is late.' },
  { id: 'coronado_paid', case: 'coronado', text: 'He paid $1,400 up front. That is not your money until you have done the work — it sits in trust.' },

  // ---- The Kestenbaum Referral ----
  { id: 'dee_injury', case: 'ferraro', text: 'Dee Ferraro cannot turn her head far enough to check a blind spot. Checking blind spots is her job.' },
  { id: 'dee_liability', case: 'ferraro', text: 'The damage is a T-bone, not a rear-end — the other driver came across the intersection and came across it fast.' },
  { id: 'dee_rival', case: 'ferraro', text: 'Vonnie Aslanian — the face on the bus bench — got to Dee first, and Dee has not said no to her yet.' },
  { id: 'kest_capping', case: 'ferraro', text: 'Kestenbaum\'s referrals come with an expectation: your clients treat with him, and he keeps sending.' },
  { id: 'kest_lien', case: 'ferraro', text: 'He bills the treatment on a lien at three times the going rate, and the lien comes out of the client\'s share, not yours.' },

  // ---- The Rivera Block ----
  { id: 'flats_notices', case: 'rivera', text: 'Thirty three-day notices, all served on a Saturday, none with a proof of service. A three-day notice served on a Saturday is not a three-day notice.' },
  { id: 'flats_sale', case: 'rivera', text: 'The building is in escrow and the sale is contingent on it being delivered vacant. The eviction is not about the tenants at all.' },
  { id: 'flats_relocation', case: 'rivera', text: 'City Ordinance 41-7: any tenant displaced by a sale is owed relocation assistance. Nobody in that glass case has been told.' },
  { id: 'flats_iris', case: 'rivera', text: 'Iris Nakamura has been organising for six weeks and has all thirty signatures on one piece of paper.' },
  { id: 'flats_halloran', case: 'rivera', text: 'Halloran will pay you $4,000 to consult on "tenant relations" — which is $4,000 for you to be unavailable.' },

  // ---- Retrieval ----
  { id: 'dch_noncompete', case: 'retrieval', text: 'The covenant: two years, fifty miles, and CLIENT OF THE FIRM defined to include anyone the firm ever opened a file on.' },
  { id: 'dch_clause9', case: 'retrieval', text: 'Clause 9. You signed it. Nobody read it out and you remember deciding that was normal.' },
  { id: 'dch_billing', case: 'retrieval', text: 'An internal billing summary: realisation by associate, four years, write-offs in their own column, and a note about which of them to have the conversation with.' },
  { id: 'dch_hargrove', case: 'retrieval', text: 'Hargrove signed the retrieval authorisation. He did not write it and he did not refuse it.' },
  { id: 'dch_list', case: 'retrieval', text: 'You did not take a document. You took a memory, and the firm has worked out that it cannot send three men to retrieve one.' },

  // ---- The Sealed File ----
  { id: 'an_index', case: 'sealed', text: 'The card index cross-references the firm to ANNEX, CONSTRUCTION OF — which is a file, in a building the firm paid for.' },
  { id: 'an_gift', case: 'sealed', text: 'DC&H gifted the Annex to the county in 1971, in perpetuity, subject to Clause 9.' },
  { id: 'an_log', case: 'sealed', text: 'The request log runs to date. The WENT BACK column is almost entirely empty, and the entries that are filled in are all in one hand.' },
  { id: 'an_ferris', case: 'sealed', text: 'Ferris has been behind that counter thirty-one years and knew which file you wanted before you said it.' },
  { id: 'an_sealed', case: 'sealed', text: 'The file is sealed, and the seal was applied by the firm rather than by any court. Nobody has ever asked whether it could do that.' },

  // ---- Sublevel C ----
  { id: 'an_sublevel', case: 'sublevel', text: 'The chain across the sublevel stair is on the floor. The air coming up is warm and somewhere down there a copier is running.' },
  { id: 'an_cards', case: 'sublevel', text: 'Four hundred index cards, one per name, each with a date of joining and a blank where a leaving date goes. Yours is filed under the year you were born.' },
  { id: 'an_boxes', case: 'sublevel', text: 'Four hundred banker\'s boxes at the end of the run, lids off. One resignation letter in each. This is where they were archived.' },
  { id: 'an_ferris_b', case: 'sublevel', text: 'Ferris is on the counter on this layer too, and has not been relieved, and is not waiting to be.' },

  // ---- The Reviews ----
  { id: 'tw_desk', case: 'reviews', text: 'The desk you woke at is out in the plaza at the correct angle to a window eleven floors up. The ring under the coffee is forty years deep.' },
  { id: 'tw_reviews', case: 'reviews', text: 'Your personnel file holds three annual reviews, one per rank, and all three are in the same hand and all three are signed by you.' },
  { id: 'tw_ninth', case: 'reviews', text: 'Scratched into the back of your own nameplate: CL. 9 IS NOT ABOUT RETIREMENT.' },

  // ---- In re: The Meeting ----
  { id: 'flats_sun', case: 'meeting', text: 'There is daylight in The Flats and there is no sun. The river is the only thing in this city that has moved since you woke up.' },
  { id: 'flats_chairs', case: 'meeting', text: 'Thirty chairs in a circle in a warm room, with the gap left at the near side for whoever is still coming.' },
  { id: 'flats_sheet', case: 'meeting', text: 'A sign-in sheet, thirty-one names in thirty-one hands, not one of them struck out. Four blank lines at the bottom.' },
  { id: 'flats_iris_b', case: 'meeting', text: 'Iris is not an echo and not a clerk. She is here, she has been here, and she is not billing anybody for it.' },

  // ---- The Impound ----
  { id: 'mr_running', case: 'impound', text: 'Every engine in the yard is running, every tank is full, and none of them are going anywhere.' },
  { id: 'mr_tickets', case: 'impound', text: 'Every windshield has an impound ticket and every ticket carries the same date — today\'s, which is the only date there is.' },
  { id: 'mr_yours', case: 'impound', text: 'One car is not running. The ticket on it is in your handwriting and it is dated tomorrow.' },
  { id: 'mr_keyring', case: 'impound', text: 'Forty-odd keys on a ring, each tagged with a matter number. Not one of them is a car key.' },
  { id: 'mr_release', case: 'impound', text: 'The Yard Man: nothing leaves this lot without a signature, and a signature is a filing like any other.' },

  { id: 'unsent_hand', case: 'unsent', text: 'The letter is not in your handwriting, and the signature line has been signed and struck out eleven times.' },
  { id: 'unsent_docket', case: 'unsent', text: 'Department 13 has one matter on its docket. You are named as counsel. You are also named as the party.' },
  { id: 'unsent_drawer', case: 'unsent', text: 'Every desk in the building has a letter like this in the drawer. Four hundred desks.' },
  { id: 'unsent_clerk', case: 'unsent', text: 'The Night Clerk: a resignation does not take effect when you write it. It takes effect when somebody FILES it.' },
  { id: 'unsent_name', case: 'unsent', text: 'The hand on this one is P. LOCKE — who banned midnight meetings, and vanished at 11:59 p.m.' },
]);

/* =============================== QUESTS ================================ */

export const CASE_HOOKS = {
  say: () => {}, banner: () => {},
  fee: () => {}, retainer: () => {}, earn: () => {}, rep: () => {},
  // Which layer we are standing on. Iris Nakamura exists on BOTH — she is the
  // same person in the same cardigan in both versions of The Flats, and that is
  // the whole point of her — so her tree has to know which one it is being
  // asked for. Quest state cannot answer it before either matter has opened.
  layer: () => 'street',
};

defineQuests([
  {
    id: 'ruiz',
    name: 'Ruiz v. Golden Wok',
    layer: 'street',
    blurb: 'A laundromat owner on The Strand has been rained on by somebody else\'s kitchen since March. The defendant is your landlord.',
    auto: true,
    stages: [
      { type: 'talk', npc: 'ruiz',
        hint: 'Somebody outside the laundromat on The Strand is trying to find a lawyer.' },
      { type: 'learn', facts: ['wok_notice', 'wok_inspection', 'wok_landlord'],
        hint: 'Work the case: the corkboard, the newsstand at Courthouse Square, and your own lease.' },
      { type: 'talk', npc: 'ruiz',
        hint: 'Go back to Ruiz and tell her what you found.' },
      { type: 'resolve',
        hint: 'Decide what you are willing to do about the conflict.',
        options: ['take', 'waive', 'refer', 'decline'] },
    ],
    onComplete(outcome) {
      const lines = {
        take: 'You took it without saying a word about the lease. It is a good case. You will be reading it under a landlord who knows your name.',
        waive: 'You told her what the Wok is to you, put the waiver in writing, and she signed it anyway — because you told her first. This is the version you can defend.',
        refer: 'You walked her down to a firm that can be neutral about it, and took the referral fee. Small, clean, and not the reason you resigned.',
        decline: 'You told her no and gave her three names. She thanked you. You went upstairs and did not turn the light on.',
      };
      CASE_HOOKS.say(lines[outcome] || 'The matter closes.', 9);
      CASE_HOOKS.banner('MATTER CLOSED', 'RUIZ v. GOLDEN WOK — ' + String(outcome).toUpperCase());
      // A contingency pays nothing today — that is what a contingency is. The
      // referral is the only one of these that puts money in the account now,
      // which is exactly the pressure the fee arrangement is supposed to create.
      CASE_HOOKS.fee({ refer: 250, take: 0, waive: 0, decline: 0 }[outcome] || 0,
        'Ruiz — referral fee');
      CASE_HOOKS.rep('strand', { waive: 3, take: 1, refer: 1, decline: -1 }[outcome] || 0);
      CASE_HOOKS.rep('courthouse', { waive: 1, take: -1 }[outcome] || 0);
    },
    onFail() {
      CASE_HOOKS.say('Ruiz\'s complaint went unfiled past the date and the court dismissed it with prejudice. She found out from a form letter. You found out from the same one.', 10);
      CASE_HOOKS.banner('DISMISSED WITH PREJUDICE', 'RUIZ v. GOLDEN WOK');
      CASE_HOOKS.rep('strand', -4);
    },
  },
  {
    id: 'coronado',
    name: 'The Coronado Notice',
    layer: 'street',
    blurb: 'Delgado was served and has four days to answer. He has the money and none of the words.',
    auto: true,
    due: 4,                       // days from the day it opens — a real deadline
    dueLabel: 'Coronado — answer due at the filing window',
    stages: [
      { type: 'talk', npc: 'delgado',
        hint: 'A man on the courthouse steps is holding a summons the wrong way up.' },
      { type: 'use', prop: 'ch_window',
        hint: 'File the answer at the clerk\'s window before the date runs out.' },
    ],
    onComplete() {
      CASE_HOOKS.say('Filed, stamped, and in the box by four. Delgado shakes your hand with the summons still in it.', 8);
      CASE_HOOKS.banner('MATTER CLOSED', 'THE CORONADO NOTICE — FILED');
      CASE_HOOKS.earn(1400, 'Coronado — answer filed');   // trust -> operating, earned
      CASE_HOOKS.rep('courthouse', 3);
    },
    onFail() {
      CASE_HOOKS.say('The window closed on the fourth day with nothing in it. Default judgment against Delgado. His $1,400 is still sitting in your trust account, and it is still his.', 10);
      CASE_HOOKS.banner('DEFAULT JUDGMENT', 'THE CORONADO NOTICE — NOT FILED');
      CASE_HOOKS.rep('courthouse', -5);
      CASE_HOOKS.rep('strand', -2);
    },
  },
  {
    id: 'ferraro',
    name: 'The Kestenbaum Referral',
    layer: 'street',
    blurb: 'A chiropractor on Motor Row has sent you a tow-truck driver with a real injury and a real case. The referral is not the problem. What comes attached to it is.',
    auto: true,
    // The city does not hand you Motor Row on day one. A referral is something
    // you get for having closed something, which is also true of referrals.
    prereq: () => isDone('ruiz') || isDone('coronado'),
    due: 6,
    dueLabel: 'Ferraro — demand due before the adjuster closes the file',
    stages: [
      { type: 'talk', npc: 'dee',
        hint: 'Motor Row, outside the tow yard. Kestenbaum\'s referral is waiting for you and has been for an hour.' },
      { type: 'learn', facts: ['dee_liability', 'kest_capping', 'kest_lien'],
        hint: 'Work it: the wreck in the body shop, the doctor himself, and whatever the alley behind his office is throwing away.' },
      { type: 'talk', npc: 'dee',
        hint: 'Go back to Dee. She is owed the version with the arrangement in it.' },
      { type: 'resolve',
        hint: 'Decide what the referral is worth to you.',
        options: ['play', 'clean', 'report', 'decline'] },
    ],
    onComplete(outcome) {
      const lines = {
        play: 'You send her back to him, and he sends you the next one, and the one after that. It is the best month you have had. The lien takes forty cents of every dollar she recovers and she will never once see the sentence that made that happen.',
        clean: 'You took the case and told him the treatment goes wherever her own doctor says it goes. He was extremely pleasant about it. He has not called since, and he is not going to.',
        report: 'You wrote it up — the ledger, the rate, the forty-one names — and walked it to the window. Motor Row will know inside a day who did that, and Motor Row is not going to be delicate about it.',
        decline: 'You gave the file back. Vonnie Aslanian signed her up on Thursday. The bus bench was right about one thing: she does not charge unless she wins.',
      };
      CASE_HOOKS.say(lines[outcome] || 'The matter closes.', 10);
      CASE_HOOKS.banner('MATTER CLOSED', 'THE KESTENBAUM REFERRAL — ' + String(outcome).toUpperCase());
      // A contingency finally pays — which is the whole argument for taking one,
      // and the reason the rent got so loud while you were working it.
      CASE_HOOKS.fee({ play: 6800, clean: 3200, report: 0, decline: 0 }[outcome] || 0,
        'Ferraro — contingency fee');
      CASE_HOOKS.rep('motor', { play: 4, clean: 1, report: -6, decline: -1 }[outcome] || 0);
      CASE_HOOKS.rep('courthouse', { play: -3, clean: 2, report: 5 }[outcome] || 0);
    },
    onFail() {
      CASE_HOOKS.say('The adjuster closed the file on the sixth day with nothing in it from you. Dee found out when the letter came. She had been telling people she had a lawyer.', 10);
      CASE_HOOKS.banner('FILE CLOSED — NO DEMAND', 'THE KESTENBAUM REFERRAL');
      CASE_HOOKS.rep('motor', -5);
      CASE_HOOKS.rep('courthouse', -2);
    },
  },
  {
    id: 'rivera',
    name: 'The Rivera Block',
    layer: 'street',
    blurb: 'Thirty units on The Flats got a three-day notice on the same Saturday. The building is in escrow and the buyer wants it empty. One of the thirty has a clipboard.',
    auto: true,
    prereq: () => isDone('ruiz') || isDone('coronado'),
    // A three-day notice runs three days. The one matter in the game whose
    // deadline is not a convention — it is the thing the notice says.
    due: 3,
    dueLabel: 'Rivera Block — the notices run out',
    stages: [
      { type: 'talk', npc: 'iris',
        hint: 'The Flats, west along the road from Courthouse Square. Somebody outside the community centre has thirty signatures and no lawyer.' },
      { type: 'learn', facts: ['flats_notices', 'flats_sale', 'flats_relocation'],
        hint: 'Work it: the glass case at the centre, the board on the fence, and whatever is blowing around the vacant lot.' },
      { type: 'talk', npc: 'iris',
        hint: 'Back to Iris. Thirty people are waiting on one sentence from you.' },
      { type: 'resolve',
        hint: 'Decide who you work for this week.',
        options: ['fight', 'settle', 'consult', 'refer'] },
    ],
    onComplete(outcome) {
      const lines = {
        fight: 'You filed thirty answers in one afternoon and the clerk stopped stamping to look at you. It cost you the week, it paid nothing, and there are thirty people on The Flats who will say your name to anybody who asks and to several people who do not.',
        settle: 'You got them relocation under 41-7 and a hundred and ten days, and you took your fee out of it, and every single one of them is still moving. It is the honest answer and it is not the one Iris wanted, and both of those are true at once.',
        consult: 'You took the consulting fee. Nobody made you sign anything and nobody asked you to do anything, which is what the four thousand was for. The notices ran out on a Thursday.',
        refer: 'Legal aid took nine of the thirty, which is what legal aid has capacity for. You did the arithmetic on the other twenty-one on the walk back and then stopped doing it.',
      };
      CASE_HOOKS.say(lines[outcome] || 'The matter closes.', 11);
      CASE_HOOKS.banner('MATTER CLOSED', 'THE RIVERA BLOCK — ' + String(outcome).toUpperCase());
      // Pro bono is pro bono. The game does not quietly reimburse you for it —
      // that is the entire content of the choice, and softening it would be a
      // lie about what the week costs.
      CASE_HOOKS.fee({ consult: 4000, settle: 1800, refer: 200, fight: 0 }[outcome] || 0,
        'Rivera Block');
      CASE_HOOKS.rep('flats', { fight: 8, settle: 2, refer: 0, consult: -8 }[outcome] || 0);
      CASE_HOOKS.rep('courthouse', { fight: 3, settle: 1, consult: -1 }[outcome] || 0);
      CASE_HOOKS.rep('strand', { fight: 2, consult: -2 }[outcome] || 0);
    },
    onFail() {
      CASE_HOOKS.say('The notices ran out. The sheriff posts on a Tuesday and the sheriff posted on a Tuesday, and the community centre had thirty chairs out that night and about nine people in them.', 11);
      CASE_HOOKS.banner('THE NOTICES RAN OUT', 'THE RIVERA BLOCK');
      CASE_HOOKS.rep('flats', -7);
      CASE_HOOKS.rep('courthouse', -2);
    },
  },
  {
    id: 'retrieval',
    name: 'Retrieval',
    layer: 'street',
    blurb: 'DC&H have sent three men to take back a client list you never physically took. The covenant they are relying on is posted inside their own front door.',
    auto: true,
    // The Tower is late. It opens once the street has decided you are a real
    // practice — which, from the firm's point of view, is exactly the problem.
    prereq: () => isDone('ferraro') || isDone('rivera'),
    stages: [
      { type: 'talk', npc: 'hargrove',
        hint: 'The Tower District, north of Courthouse Square. Somebody up there signed the authorisation and it was not a stranger.' },
      { type: 'learn', facts: ['dch_noncompete', 'dch_clause9', 'dch_billing'],
        hint: 'Read the covenant on their own door. Then find what they left in the plaza and on the dock.' },
      { type: 'talk', npc: 'hargrove',
        hint: 'Back to Hargrove with the covenant, Clause 9, and the billing summary.' },
      { type: 'resolve',
        hint: 'Decide what you are walking out of that plaza holding.',
        options: ['keep', 'return', 'sign'] },
    ],
    onComplete(outcome) {
      const lines = {
        keep: 'You kept the summary. Nothing improves. The retrieval does not stop and the covenant does not soften and there is now a thing in your files that they would very much rather was in theirs, and that is the entire benefit and it is enough.',
        return: 'You gave the boxes back and they called the men off, and the covenant is still two years and fifty miles, and you have handed over the only document that was ever going to be worth anything to you.',
        sign: 'You signed the release in the plaza on the roof of the grey van. No admission, no covenant enforcement, no further contact. It is a clean, complete, entirely reasonable end to it, and there is nothing left to bring.',
      };
      CASE_HOOKS.say(lines[outcome] || 'The matter closes.', 11);
      CASE_HOOKS.banner('MATTER CLOSED', 'RETRIEVAL — ' + String(outcome).toUpperCase());
      CASE_HOOKS.fee({ sign: 2500, return: 600, keep: 0 }[outcome] || 0, 'DC&H — release');
      CASE_HOOKS.rep('tower', { sign: 2, return: 1, keep: -3 }[outcome] || 0);
      CASE_HOOKS.rep('courthouse', { keep: 2 }[outcome] || 0);
    },
  },
  {
    id: 'sealed',
    name: 'The Sealed File',
    layer: 'street',
    blurb: 'The Annex holds a file called ANNEX, CONSTRUCTION OF. The building was a gift from the firm, the gift was subject to Clause 9, and the file about it is sealed by the donor.',
    auto: true,
    prereq: () => isDone('retrieval'),
    stages: [
      { type: 'talk', npc: 'ferris',
        hint: 'The Annex, up the stair at the north end of The Strand or across from the Tower. Somebody has been on that counter thirty-one years.' },
      { type: 'learn', facts: ['an_index', 'an_gift', 'an_log'],
        hint: 'Work the room: the index under D, the dedication in the corridor, and whatever is at the end of the last run.' },
      { type: 'talk', npc: 'ferris',
        hint: 'Back to Ferris with the cross-reference, the dedication and the log.' },
      { type: 'resolve',
        hint: 'Decide how you get at a file the firm sealed in a public building.',
        options: ['request', 'pull', 'leave'] },
    ],
    onComplete(outcome) {
      const lines = {
        request: 'You filed the request properly, on the form, in the log, in front of him. It will not be granted. That was never the point — the point is that there is now a line in a public register with a date on it and your name, and a refusal has to be a refusal OF something.',
        pull: 'You went down and took it. Ferris did not stop you and did not look away either, which was worse, and the walk back up took a very long time. You have the file. Everybody in that building knows who has it.',
        leave: 'You left it sealed. It is still there, it will be there next year, and the thing you have instead of the file is the knowledge that the firm can seal a record in a building it gave away.',
      };
      CASE_HOOKS.say(lines[outcome] || 'The matter closes.', 11);
      CASE_HOOKS.banner('MATTER CLOSED', 'THE SEALED FILE — ' + String(outcome).toUpperCase());
      CASE_HOOKS.rep('annex', { request: 3, pull: -5, leave: 0 }[outcome] || 0);
      CASE_HOOKS.rep('courthouse', { request: 2, pull: 1 }[outcome] || 0);
      CASE_HOOKS.rep('tower', { request: -2, pull: -3 }[outcome] || 0);
    },
  },
  {
    id: 'sublevel',
    name: 'Sublevel C',
    layer: 'floor',
    blurb: 'The chain across the sublevel stair is on the floor and something down there is running a copier. DESIGN said there were four hundred of them. They are filed.',
    auto: true,
    prereq: () => isDone('reviews'),
    stages: [
      { type: 'learn', facts: ['an_sublevel', 'an_cards'],
        hint: 'The Annex. Find the stair everybody has walked past, and then look at what is in the index under your own name.' },
      { type: 'talk', npc: 'ferris',
        hint: 'The counter is staffed. It has been staffed the whole time.' },
      { type: 'learn', fact: 'an_boxes',
        hint: 'The end of the last run in the stacks. The lids are already off.' },
      { type: 'resolve',
        hint: 'Four hundred boxes. Decide what you do about that.',
        options: ['count', 'take', 'close'] },
    ],
    onComplete(outcome) {
      const lines = {
        count: 'You count them. It takes most of what you have and the number is four hundred exactly, which is worse than four hundred and six or three hundred and ninety would have been, because four hundred exactly is a number somebody chose.',
        take: 'You pull your own card out of the index and put it in your jacket. The drawer does not close any better for the gap. Somewhere below you the copier stops, for the first time since you woke up, and then starts again.',
        close: 'You go down the run putting the lids back on. Four hundred of them. It takes hours and it changes nothing and it is the only thing anybody has done for these people in forty years.',
      };
      CASE_HOOKS.say(lines[outcome] || 'The matter closes.', 12);
      CASE_HOOKS.banner('MATTER CLOSED', 'SUBLEVEL C — ' + String(outcome).toUpperCase());
    },
  },
  {
    id: 'reviews',
    name: 'The Reviews',
    layer: 'floor',
    blurb: 'Your personnel file is open on a chair in the plaza, and there are three annual reviews in it, and all three of them are walking around out here.',
    auto: true,
    prereq: () => isDone('impound') || isDone('meeting'),
    stages: [
      { type: 'learn', facts: ['tw_desk', 'tw_reviews'],
        hint: 'The Tower District, up the ramp north of the courthouse. Find the desk you woke at, and the file beside it.' },
      { type: 'kill', enemy: 'past_junior',
        hint: 'The first review. He is faster than you and he does not know anything yet.' },
      { type: 'kill', enemy: 'past_counsel',
        hint: 'The second review. She has read everything you are about to say.' },
      { type: 'kill', enemy: 'past_partner',
        hint: 'The third. He is not a warning and he will tell you so.' },
      { type: 'resolve',
        hint: 'The file is still open on the chair. Decide what goes in it.',
        options: ['sign_off', 'refuse', 'read'] },
    ],
    onComplete(outcome) {
      const lines = {
        sign_off: 'You sign the fourth review the way you signed the other three: at the bottom, in the box, without reading the part above it. The file closes itself. It is not heavier.',
        refuse: 'You leave the fourth one blank. Nothing enforces it. Nobody comes. The blank stays blank, and it turns out that a blank in a file this old is the loudest thing on the floor.',
        read: 'You read all three properly for the first time, which takes longer than the fighting did. They are not bad reviews. They are accurate, and generous, and every single one of them describes somebody who was going to be fine, and all three were written by you.',
      };
      CASE_HOOKS.say(lines[outcome] || 'The matter closes.', 12);
      CASE_HOOKS.banner('MATTER CLOSED', 'THE REVIEWS — ' + String(outcome).toUpperCase());
    },
  },
  {
    id: 'meeting',
    name: 'In re: The Meeting',
    layer: 'floor',
    blurb: 'There is daylight in The Flats and no sun to make it. In the community centre somebody has set out thirty chairs, and there is a sheet on the door with room at the bottom.',
    auto: true,
    prereq: () => isDone('unsent'),
    stages: [
      { type: 'learn', facts: ['flats_sun', 'flats_chairs'],
        hint: 'West along the road, past the courthouse, as far as the river goes. Something down there is lit and it is not on your timesheet.' },
      { type: 'learn', fact: 'flats_sheet',
        hint: 'There is a sheet on the door of the big room.' },
      { type: 'talk', npc: 'iris',
        hint: 'Somebody is setting out chairs. Ask her how long she has been doing that.' },
      { type: 'resolve',
        hint: 'Decide what you do about the four blank lines.',
        options: ['sign', 'stay', 'go'] },
    ],
    onComplete(outcome) {
      const lines = {
        sign: 'You put your name on line thirty-two. It is the first thing you have signed in this building that was not a release, a release form, or a release of somebody else, and nothing whatsoever happens, and the room stays warm.',
        stay: 'You take the chair in the gap and you do not sign anything, and at some point you notice you have stopped listening for the corridor. Nobody asks you for the sheet. That is how you know it was never the sheet.',
        go: 'You leave before it starts. Out on the road the temperature drops about four degrees at the district line, exactly at the line, and behind you the light does not follow and does not go out either.',
      };
      CASE_HOOKS.say(lines[outcome] || 'The matter closes.', 11);
      CASE_HOOKS.banner('MATTER CLOSED', 'IN RE: THE MEETING — ' + String(outcome).toUpperCase());
    },
  },
  {
    id: 'impound',
    name: 'The Impound',
    layer: 'floor',
    blurb: 'Four rows of cars in a fenced lot on Motor Row, every engine running, every windshield ticketed for the same day. One of them is not running.',
    auto: true,
    prereq: () => isDone('unsent'),
    stages: [
      { type: 'learn', facts: ['mr_running', 'mr_tickets'],
        hint: 'Motor Row, down the alley south of the courthouse. Look at the cars, and then look at what is under the wipers.' },
      { type: 'learn', fact: 'mr_yours',
        hint: 'One of them is not running. Find it.' },
      { type: 'talk', npc: 'yardman',
        hint: 'Somebody is on the gate. He has been on the gate a long time.' },
      { type: 'resolve',
        hint: 'Decide what you are taking out of this lot.',
        options: ['sign', 'read', 'leave'] },
    ],
    onComplete(outcome) {
      const lines = {
        sign: 'You sign it. He tears the ticket along the perforation and gives you the short half, and the engine turns over on the first try after forty years of not being asked, and you do not get in.',
        read: 'You go down the rows matching tags to tickets until you have all forty-one names, and every one of them is somebody who was going to leave, and every one of them is still here. You put the ring in your pocket. It is the heaviest thing you are carrying.',
        leave: 'You walk out through the gate and he does not stop you, and the storage on a car in that lot runs sixty-five a day, and it has been running for forty years, and the number that makes is not a number anybody intends to be paid.',
      };
      CASE_HOOKS.say(lines[outcome] || 'The matter closes.', 10);
      CASE_HOOKS.banner('MATTER CLOSED', 'THE IMPOUND — ' + String(outcome).toUpperCase());
    },
  },
  {
    id: 'unsent',
    name: 'In re: The Unsent',
    layer: 'floor',
    blurb: 'You woke holding somebody else\'s resignation letter. It has been signed eleven times and sent none.',
    auto: true,
    stages: [
      { type: 'learn', fact: 'unsent_hand',
        hint: 'Find the letter. It was left where you would trip over it.' },
      { type: 'learn', facts: ['unsent_docket', 'unsent_drawer'],
        hint: 'Read the docket at Department 13. Then look at what is in every other desk.' },
      { type: 'talk', npc: 'clerk',
        hint: 'Somebody is still working the night shift at Department 13. Ask.' },
      { type: 'resolve',
        hint: 'Decide what happens to the letter.',
        options: ['file', 'keep', 'burn'] },
    ],
    onComplete(outcome) {
      const lines = {
        file: 'You filed it. Somewhere above you a light goes out — one, on a floor with four hundred. It is not much. It is one.',
        keep: 'You fold it into your jacket. It is evidence, and evidence is what you have instead of a way out.',
        burn: 'It goes up fast, the way forty-year-old paper does. The building does not react, which is worse than if it had.',
      };
      CASE_HOOKS.say(lines[outcome] || 'The matter closes.', 9);
      CASE_HOOKS.banner('MATTER CLOSED', 'IN RE: THE UNSENT — ' + String(outcome).toUpperCase());
    },
  },
]);

/* ============================== DIALOGUE =============================== */
// Trees are rebuilt on every conversation so they can read live state; the
// engine never caches a node.

/**
 * Iris on THE FLOOR. Split out rather than nested so the street version stays
 * readable — they are two long trees for one person and neither is a variant
 * of the other. She does not know you here. She is not surprised by you either.
 */
function irisFloor() {
  const T = { who: 'Iris Nakamura', spr: 'iris', nodes: {} };

  if (isDone('meeting')) {
    T.start = 'a';
    T.nodes.a = {
      text: {
        sign: 'Line thirty-two. — She has the sheet on the clipboard and she is not looking at it. — We start at seven. We have started at seven for a while.',
        stay: 'You came back. — She sets out a thirty-first chair without being asked and without making anything of it.',
        go: 'You came back. — She does not say it pointedly. That is the thing you keep failing to get used to about this district.',
      }[outcomeOf('meeting')] || 'Evening.',
    };
    return T;
  }

  T.start = 'a';
  T.nodes.a = {
    text: 'Grab that end. — She is carrying a stack of chairs and she has decided you are helping before establishing whether you are. — Circle, not rows. Rows is a presentation. Circle is a meeting.',
    choices: [
      { label: 'Help with the chairs.', to: 'chairs' },
      { label: '"How long have you been doing this?"', to: 'long' },
    ],
  };
  T.nodes.chairs = {
    text: 'Thirty. Always thirty, and always the gap at that end, because somebody is always still coming and you do not make them ask you to move.',
    choices: [{ label: '"How long have you been doing this?"', to: 'long' }],
  };
  T.nodes.long = {
    text: 'Thursdays. — That is not — I know what you asked. — She straightens up. — I have been doing this on Thursdays. You want a number and I do not have one and I have stopped finding that frightening, which took a while.',
    fx: () => { learn('flats_iris_b'); },
    choices: [
      { label: '"There is no sun. Where is the light coming from?"', to: 'light' },
      { tag: 'THE SHEET', label: 'Ask about the four blank lines.',
        if: () => knows('flats_sheet'), showLocked: true,
        lockedNote: 'you have not read the sheet', to: 'sheet' },
    ],
  };
  T.nodes.light = {
    text: 'It was here when I got here. — Doesn\'t that— — She thinks about it properly, which nobody else in this building has done all night. — It is the only thing on this street nobody is paying for. I decided a long time ago that that was enough of an explanation to be getting on with.',
    choices: [
      { tag: 'THE SHEET', label: 'Ask about the four blank lines.',
        if: () => knows('flats_sheet'), showLocked: true,
        lockedNote: 'you have not read the sheet', to: 'sheet' },
      { label: 'Say nothing.', to: null },
    ],
  };
  T.nodes.sheet = {
    text: 'Thirty-one. — And four spaces. — There are always four spaces. When it fills I get another sheet. — She holds the clipboard out and does not push it at you, and the pen is already unclipped, and she has clearly done this exact motion a great many times and has never once been rude about the answer.',
    choices: [
      { tag: 'SIGN', label: 'Put your name on line thirty-two.',
        if: () => knows('flats_sheet', 'flats_iris_b'), to: 'do_sign' },
      { label: 'Don\'t sign. Take the chair in the gap and stay.', to: 'do_stay' },
      { label: 'Leave before it starts.', to: 'do_go' },
      { label: 'Not yet.', to: null },
    ],
  };
  T.nodes.do_sign = {
    text: 'You write it out. Not the signature — the whole name, the way you write it on a form and not on a pleading. Nothing happens. No stamp, no light, nobody above you on any floor. She clips the pen back on and says: seven o\'clock, and puts the board back on the nail.',
    fx: () => qResolve('meeting', 'sign'),
  };
  T.nodes.do_stay = {
    text: 'You sit down in the gap. She does not comment on it and does not move the chair. Somewhere around the point where you stop listening for the corridor you notice you have stopped listening for the corridor.',
    fx: () => qResolve('meeting', 'stay'),
  };
  T.nodes.do_go = {
    text: 'Door\'s open Thursdays, she says, without turning round, and without the slightest edge on it. Out on the road the temperature drops about four degrees at the district line — exactly at the line — and behind you the light does not follow you and does not go out.',
    fx: () => qResolve('meeting', 'go'),
  };
  return T;
}

/** Ferris on THE FLOOR. Same counter, same man, and he has not been relieved. */
function ferrisFloor() {
  const T = { who: 'Ferris', spr: 'ferris', nodes: {} };
  if (isDone('sublevel')) {
    T.start = 'a';
    T.nodes.a = {
      text: {
        count: 'Four hundred. — You counted too. — I counted in 1974, counsellor. It was four hundred then.',
        take: 'The drawer will not shut. — No. — He does not ask you to put it back.',
        close: 'You did the lids. — Somebody had to. — He looks down the run for a while. — Yes. For about forty years, somebody had to.',
      }[outcomeOf('sublevel')] || 'Counter is open.',
    };
    return T;
  }
  T.start = 'a';
  T.nodes.a = {
    text: 'Counter is open. — He is exactly where he was in the other version of this, in the same cardigan, holding the same pen, and he does not appear to have noticed that anything is different, which is the thing you cannot get past.',
    choices: [
      { label: '"How long have you been on this counter?"', to: 'long' },
      { tag: 'THE STAIR', label: 'Ask about the chain being down.',
        if: () => knows('an_sublevel'), showLocked: true,
        lockedNote: 'you have not been to the stair', to: 'stair' },
    ],
  };
  T.nodes.long = {
    text: 'Thirty-one years. — He says it without any of the weight you were braced for. — I have been asked that a great many times and the number has not changed, and I would like you to sit with why that is rather than have me say it.',
    fx: () => { learn('an_ferris_b'); },
    choices: [
      { tag: 'THE STAIR', label: 'Ask about the chain being down.',
        if: () => knows('an_sublevel'), showLocked: true,
        lockedNote: 'you have not been to the stair', to: 'stair' },
      { label: 'Say nothing.', to: null },
    ],
  };
  T.nodes.stair = {
    text: 'The chain has been down since 1994. — Somebody took it down? — Somebody unlocked it and did not take it off and did not put it back, and I wrote that in the log every year for thirty-one years, and every year the log went into the sublevel with everything else.',
    choices: [
      { label: '"What is down there?"', to: 'what' },
    ],
  };
  T.nodes.what = {
    text: 'Four hundred boxes. — Of? — Of the same thing. — He finally puts the pen down. — Every one of them wrote it, counsellor. Every single one. That is not the sad part and I want to be precise with you about which part is the sad part: they all wrote it, and then they all filed it here, and filing is not sending.',
  };
  return T;
}

/**
 * The boxes at the end of the last run — a prop with a `tree`, because the
 * thing you have the conversation with is four hundred cardboard boxes.
 */
function annexBoxes() {
  const T = { who: 'FOUR HUNDRED BOXES', spr: 'dossier', nodes: {} };
  const stage = currentStage('sublevel');

  if (isDone('sublevel')) {
    T.start = 'a';
    T.nodes.a = {
      text: {
        count: 'Four hundred. You have checked. You will check again.',
        take: 'Three hundred and ninety-nine cards in the drawer, four hundred boxes on the shelf, and the discrepancy is in your jacket.',
        close: 'Four hundred lids, on. It looks like a records store now instead of an accusation, and you are not sure that is an improvement.',
      }[outcomeOf('sublevel')] || 'The boxes are where they were.',
    };
    return T;
  }

  if (!stage || stage.type !== 'resolve') {
    T.start = 'a';
    T.nodes.a = {
      text: 'Banker\'s boxes, end to end, the whole length of the run and round the corner. The lids are off and stacked separately, tidily, by somebody who intended to come back. In the nearest one, a single sheet of paper, folded once. You do not need to open it to know what it is, and you open it anyway, and you are right.',
    };
    return T;
  }

  T.start = 'a';
  T.nodes.a = {
    text: 'One letter per box. Every one of them written, and signed, and folded once, and filed. Not sent. Filed — which is a thing you do with a document you have decided to keep rather than use, and which four hundred people independently decided was the correct disposition.',
    choices: [
      { tag: 'COUNT', label: 'Count them. All of them. Get the actual number.', to: 'do_count' },
      { label: 'Take your own card out of the index and keep it.', to: 'do_take' },
      { label: 'Put the lids back on. All four hundred.', to: 'do_close' },
      { label: 'Step back.', to: null },
    ],
  };
  T.nodes.do_count = {
    text: 'It takes most of what you have. Four hundred exactly — not three hundred and ninety-one, not four hundred and six. Exactly four hundred, which is a number somebody chose, which means somebody stopped.',
    fx: () => qResolve('sublevel', 'count'),
  };
  T.nodes.do_take = {
    text: 'You go back to the index and pull your own card and put it in your jacket. The drawer does not close any better for the gap. Somewhere below you the copier stops for the first time since you woke up — and then, after about four seconds, starts again.',
    fx: () => qResolve('sublevel', 'take'),
  };
  T.nodes.do_close = {
    text: 'You work down the run putting the lids back on. It takes hours. It changes nothing, it proves nothing, and nobody will ever know it happened — and it is the only thing anybody has done for any of these people in forty years.',
    fx: () => qResolve('sublevel', 'close'),
  };
  return T;
}

const NPC_TREES = {
  annexboxes: annexBoxes,

  /* ------------------------------ MARISOL RUIZ ------------------------------ */
  ruiz() {
    const stage = currentStage('ruiz');
    const phase = !started('ruiz') || (stage && stage.type === 'talk' && !knows('ruiz_ceiling')) ? 'intake'
      : isDone('ruiz') ? 'after'
        : (stage && stage.type === 'resolve') || knows('wok_notice', 'wok_inspection', 'wok_landlord') ? 'report'
          : 'working';

    const T = { who: 'Marisol Ruiz', spr: 'ruiz', nodes: {} };

    if (phase === 'intake') {
      T.start = 'a';
      T.nodes.a = {
        text: 'You\'re the one upstairs. Over the Wok. — Don\'t look like that, everybody knows, there\'s a strip of tape with your name on the buzzer.',
        to: 'b',
      };
      T.nodes.b = {
        text: 'I run the laundromat. Since March there\'s been grease coming through my ceiling. Not water. Grease. It comes down on the folding table and I have to throw the whole load out and eat it.',
        choices: [
          { label: 'How long has this been going on, exactly?', to: 'c' },
          { label: 'Have you asked them to fix it?', to: 'c' },
        ],
      };
      T.nodes.c = {
        text: 'Since March. I asked them four times. Twice I wrote it down, because my cousin said always write it down. They said they\'d look at it. Then they said it was my pipes. I don\'t have pipes up there. I have their kitchen.',
        fx: () => { learn('ruiz_ceiling'); learn('ruiz_asked'); },
        choices: [
          { label: 'I\'ll look into it. Don\'t sign anything.', to: 'd' },
          { label: 'Write down every date you remember. I\'ll be back.', to: 'd' },
        ],
      };
      T.nodes.d = {
        text: 'That\'s it? You don\'t want money first? — Okay. Okay. Everybody else wanted money first.',
      };
      return T;
    }

    if (phase === 'working') {
      T.start = 'a';
      T.nodes.a = {
        text: 'You got that look. My cousin gets that look when he\'s about to tell me something\'s complicated.',
        choices: [
          { label: 'Still working. I\'ll come back when I have something.', to: null },
          { tag: 'PROGRESS', label: 'Tell her what you have so far.',
            if: () => knowsAny('wok_notice', 'wok_inspection', 'wok_landlord'), to: 'b' },
        ],
      };
      T.nodes.b = {
        text: 'That\'s more than the last guy got, and the last guy charged me forty dollars for it.',
      };
      return T;
    }

    if (phase === 'report') {
      T.start = 'a';
      T.nodes.a = {
        text: 'Okay. Tell me. And tell me the bad part first, because there\'s always a bad part and I\'d rather not sit through the good part waiting for it.',
        to: 'b',
      };
      T.nodes.b = {
        text: 'The county came out. Twice in one week. There was a notice on the corkboard and somebody took it down before it was supposed to come down. That\'s her case — the notice, the inspections, and four months of her asking in writing. And there is one more thing, and it is about you.',
        choices: [
          { tag: 'CONFLICT', label: '"The Golden Wok is my landlord. I rent Suite 2B from them."',
            if: () => knows('wok_landlord'), to: 'conflict' },
          { label: 'Say nothing about the lease. Take the case.', to: 'take' },
        ],
      };
      T.nodes.conflict = {
        text: 'She goes quiet for a second. — So if you fight them, they can put you on the street. And if they put you on the street, you stop fighting them. That\'s the bad part?',
        to: 'options',
      };
      T.nodes.take = {
        text: 'Then we\'re doing it? — Yeah. Okay. Okay, good. You want the dates, I wrote down the dates.',
        fx: () => qResolve('ruiz', 'take'),
      };
      T.nodes.options = {
        text: 'So what happens now.',
        choices: [
          { tag: 'WAIVER', label: 'Put the conflict in writing and let her decide with it in front of her.',
            if: () => knows('wok_landlord', 'wok_notice', 'wok_inspection'),
            to: 'waive' },
          { label: 'Refer her out to somebody who can be neutral. Take the referral fee.', to: 'refer' },
          { label: 'Decline it. Give her three names.', to: 'decline' },
          { label: 'Take it anyway. You need the work.', to: 'take2' },
        ],
      };
      T.nodes.waive = {
        text: 'You write it out on the folding table: who they are to you, what could happen to you, what could happen to her, and that she can walk to anybody else on this street. She reads all of it. Then she signs it. — I want the one who knows where the grease comes from.',
        fx: () => qResolve('ruiz', 'waive'),
      };
      T.nodes.refer = {
        text: 'She takes the card and looks at it a long time. — You\'re sending me to a nicer office. — Yeah. — Will they know about the corkboard? — I\'ll tell them about the corkboard.',
        fx: () => qResolve('ruiz', 'refer'),
      };
      T.nodes.decline = {
        text: 'She nods like she expected it, which is the part that stays with you. — It\'s okay. You got your own kitchen over your head.',
        fx: () => qResolve('ruiz', 'decline'),
      };
      T.nodes.take2 = {
        text: 'Then we\'re doing it. — She shakes your hand with both of hers. You have not told her the thing you know, and you notice that you have decided not to.',
        fx: () => qResolve('ruiz', 'take'),
      };
      return T;
    }

    // after
    T.start = 'a';
    T.nodes.a = {
      text: {
        take: 'So when do they get the papers? — Soon. — Good. I told my cousin. He says you\'re either very good or very new.',
        waive: 'I still have the paper you wrote. The one about you. I put it in the folder with the dates.',
        refer: 'The nice office called. They said "we\'re in receipt." I don\'t know what that means but they said it twice.',
        decline: 'I called the second name on your list. They wanted money first. — Yeah. — Yeah.',
      }[outcomeOf('ruiz')] || 'Thanks for coming by.',
    };
    return T;
  },

  /* -------------------------------- DELGADO -------------------------------- */
  delgado() {
    const T = { who: 'Arturo Delgado', spr: 'delgado', nodes: {} };
    if (isDone('coronado')) {
      T.start = 'a';
      T.nodes.a = { text: isFailedCase('coronado')
        ? 'You said four days. — I know. — I gave you the money on a Tuesday. I remember because I close on Tuesdays.'
        : 'My wife says I should have been worried. I told her I had a lawyer. She said those are the same sentence.' };
      return T;
    }
    T.start = 'a';
    T.nodes.a = {
      text: 'You do law? Real law? — He is holding a summons upside down, which he has clearly been doing for some time. — They gave me this on the twenty-eighth. It says twenty days and I counted and it is not twenty days.',
      choices: [{ label: 'Let me see the caption.', to: 'b' }],
    };
    T.nodes.b = {
      text: 'CORONADO ARMS LLC v. A. DELGADO. Service on the 28th. The answer date is four days out and he has spent most of the twenty deciding whether it was real.',
      fx: () => learn('coronado_deadline'),
      choices: [
        { label: '"I can file an answer. It has to be at the window before the date."', to: 'c' },
        { label: '"You need somebody with more time than me."', to: 'no' },
      ],
    };
    T.nodes.c = {
      text: 'He counts it out on the step — fourteen hundred, in an envelope that has been opened and re-closed several times. — That is everything in the coffee can. When do I know?',
      fx: () => {
        learn('coronado_paid');
        CASE_HOOKS.retainer(1400, 'Delgado — retainer (UNEARNED)');
      },
      choices: [{ label: '"When it is stamped. Not before."', to: 'd' }],
    };
    T.nodes.d = {
      text: 'Then I will be here. — He sits back down on the step, next to the summons, and does not look at either of you.',
    };
    T.nodes.no = {
      text: 'Yeah. Yeah, okay. — He folds the summons into a square small enough to stop being a summons.',
    };
    return T;
  },

  /* -------------------------------- FERRIS --------------------------------- */
  // The second person who exists on both layers, and the opposite of Iris about
  // it: she is unchanged because the building never owned her, he is unchanged
  // because he was never going anywhere. Thirty-one years either way.
  ferris() {
    if (CASE_HOOKS.layer() === 'floor') return ferrisFloor();

    const stage = currentStage('sealed');
    const phase = !started('sealed') || (stage && stage.type === 'talk' && !knows('an_ferris')) ? 'intake'
      : isDone('sealed') ? 'after'
        : (stage && stage.type === 'resolve') || knows('an_index', 'an_gift', 'an_log') ? 'report'
          : 'working';

    const T = { who: 'Ferris', spr: 'ferris', nodes: {} };

    if (phase === 'intake') {
      T.start = 'a';
      T.nodes.a = {
        text: 'ANNEX, CONSTRUCTION OF. — You have not said anything yet. — No. — He turns a page. — Thirty-one years, counsellor. There are four files in this building anybody comes in here for and three of them are divorces.',
        fx: () => { learn('an_ferris'); },
        choices: [
          { label: '"Can I see it?"', to: 'no' },
          { label: '"Who else has asked?"', to: 'who' },
        ],
      };
      T.nodes.who = {
        text: 'Six. Over thirty-one years. — And? — And the log is on the shelf at the end of the last run and I am not going to stop you reading it, which is a different sentence from me handing it to you and I would like you to notice that it is.',
        to: 'no',
      };
      T.nodes.no = {
        text: 'You cannot see it. It is sealed. — By the court? — He looks up properly for the first time. — No.',
      };
      return T;
    }

    if (phase === 'working') {
      T.start = 'a';
      T.nodes.a = {
        text: 'Still here. Still sealed.',
        choices: [
          { label: 'Keep looking.', to: null },
          { tag: 'PROGRESS', label: 'Tell him what you have.',
            if: () => knowsAny('an_index', 'an_gift', 'an_log'), to: 'b' },
        ],
      };
      T.nodes.b = { text: 'Mm. — That is the whole response, and it is not dismissive, it is a man confirming a total.' };
      return T;
    }

    if (phase === 'report') {
      T.start = 'a';
      T.nodes.a = {
        text: 'The firm built this building and gave it to the county in 1971, in perpetuity, subject to Clause 9. The file about that gift is in the sublevels. And the seal on it was applied by the donor.',
        to: 'b',
      };
      T.nodes.b = {
        text: 'That is right. — Can they do that? — He puts the pen down. — Nobody has ever asked. In thirty-one years, counsellor, six people have requested that file and not one of them has asked me whether the seal was lawful, and I have had a very long time to notice that.',
        fx: () => { learn('an_sealed'); },
        choices: [
          { tag: 'ON THE RECORD', label: 'File the request properly. Make them refuse it in writing.',
            if: () => knows('an_log', 'an_gift'), to: 'request' },
          { label: 'Walk down and take it.', to: 'pull' },
          { label: 'Leave it sealed.', to: 'leave' },
          { label: 'Think about it.', to: null },
        ],
      };
      T.nodes.request = {
        text: 'He gives you the form without being asked, which means it was already under the counter, which means he has been keeping one there. — It will be refused. — I know. — He stamps the log. — Then you have understood the form.',
        fx: () => qResolve('sealed', 'request'),
      };
      T.nodes.pull = {
        text: 'He does not move and he does not look away, and the second of those is the one that stays with you. When you come back up he has already written the entry, and the column marked WENT BACK is blank, and he has ruled a line through it rather than leaving it empty.',
        fx: () => qResolve('sealed', 'pull'),
      };
      T.nodes.leave = {
        text: 'Sensible. — He does not mean it as a compliment and does not mean it as an insult. — It will be here. That is the one thing I can absolutely promise you about it.',
        fx: () => qResolve('sealed', 'leave'),
      };
      return T;
    }

    T.start = 'a';
    T.nodes.a = {
      text: {
        request: 'The refusal came back Tuesday. Two lines. I have put it in the log next to the request, which is where a refusal goes, and which is the first time in thirty-one years I have had a pair.',
        pull: 'The county sent somebody to ask me about it. — What did you say? — That the chain has been down since 1994 and I have written that in the log every year. — Ferris — I have written it every year, counsellor.',
        leave: 'Still sealed. — He nods at the stair. — Still down there.',
      }[outcomeOf('sealed')] || 'Counter closes at four.',
    };
    return T;
  },

  /* ------------------------------- HARGROVE -------------------------------- */
  // The LE1 callback. He is not the villain and never was, which is worse: he
  // is a man who signed a thing because somebody put it in front of him, and he
  // will tell you that himself, accurately, and it will not help either of you.
  hargrove() {
    const stage = currentStage('retrieval');
    const phase = !started('retrieval') || (stage && stage.type === 'talk' && !knows('dch_hargrove')) ? 'intake'
      : isDone('retrieval') ? 'after'
        : (stage && stage.type === 'resolve') || knows('dch_noncompete', 'dch_clause9', 'dch_billing') ? 'report'
          : 'working';

    const T = { who: 'Emmett Hargrove', spr: 'hargrove', nodes: {} };

    if (phase === 'intake') {
      T.start = 'a';
      T.nodes.a = {
        text: 'He is standing in the plaza at eleven in the morning with no coat and no reason to be out here, which means he has been waiting, which means somebody told him you were coming. — You look well. — I look employed. — He accepts that as the correction it is.',
        to: 'b',
      };
      T.nodes.b = {
        text: 'They have sent people after you. — He does not phrase it as a question. — Three of them. Retrieval Associates, which is a job title somebody was paid to invent. I signed the authorisation.',
        choices: [
          { label: '"You signed it."', to: 'signed' },
          { label: '"What do they think I took?"', to: 'signed' },
        ],
      };
      T.nodes.signed = {
        text: 'I signed it. I did not write it and I did not refuse it and I would like you to hold both of those at once, because I have had four months of practice and I can just about manage it. — What do they think I took? — The list. — I didn\'t take a list. — He nods. — No. You took the memory of one. They have not worked out how to send three men after that, and it is genuinely keeping somebody awake.',
        fx: () => { learn('dch_hargrove'); learn('dch_list'); },
        choices: [{ label: 'Say nothing for a moment.', to: 'end' }],
      };
      T.nodes.end = {
        text: 'Read the covenant. — I know the covenant. — He looks at the doors. — Read it on the door, counsellor. Not from memory. They amended it, and they amended it after you left, and they posted it, because posting it is what makes it enforceable and somebody in there knows every single one of those rules.',
      };
      return T;
    }

    if (phase === 'working') {
      T.start = 'a';
      T.nodes.a = {
        text: 'Still out here. I have a window I could be behind.',
        choices: [
          { label: 'Still reading.', to: null },
          { tag: 'PROGRESS', label: 'Tell him what you have found.',
            if: () => knowsAny('dch_noncompete', 'dch_clause9', 'dch_billing'), to: 'b' },
        ],
      };
      T.nodes.b = { text: 'Keep going. And do not tell me where you found the last one, because I would then know it.' };
      return T;
    }

    if (phase === 'report') {
      T.start = 'a';
      T.nodes.a = {
        text: 'You have read it. — Two years, fifty miles, and a definition of CLIENT that covers anybody they ever opened a file on. That is not a covenant, that is a fence around a career. — Yes. — And Clause 9 is still in there. — Yes.',
        to: 'b',
      };
      T.nodes.b = {
        text: 'And I have the internal billing summary off your loading dock, which has a column in it for write-offs and a note at the bottom about which associates to have the conversation with.',
        choices: [
          { tag: 'COUNTERSUE', label: 'Keep it. Whatever they file, you file back.',
            if: () => knows('dch_billing', 'dch_noncompete'), to: 'keep' },
          { label: 'Give the boxes back and have them call the men off.', to: 'return' },
          { label: 'Ask what they would pay to end it today.', to: 'sign' },
          { label: 'Not decided.', to: null },
        ],
      };
      T.nodes.keep = {
        text: 'He looks at the folder for a long moment and does not reach for it. — You understand that if you keep that, this stops being a thing that goes away. — I understand. — He nods once, and then, quietly, in a voice he has clearly been holding somewhere for four months: good.',
        fx: () => qResolve('retrieval', 'keep'),
      };
      T.nodes.return = {
        text: 'That is the sensible one. — He says it without any weight at all, which is how you know what he thinks of it. — I will have the men called off this afternoon. The covenant stands. It was always going to stand; that was never the part that was up for discussion.',
        fx: () => qResolve('retrieval', 'return'),
      };
      T.nodes.sign = {
        text: 'Twenty-five hundred and a mutual release. No admission, no enforcement, no further contact. — He produces it from an inside pocket, already drawn, already dated today. — I would like the record to show that I did not enjoy having this in my coat.',
        fx: () => qResolve('retrieval', 'sign'),
      };
      return T;
    }

    T.start = 'a';
    T.nodes.a = {
      text: {
        keep: 'They know you have it. Nobody has said so and everybody has stopped saying several other things, which is how a firm says so.',
        return: 'It is quieter. — Is it better? — He watches the plaza for a while. — It is quieter.',
        sign: 'Clean file. — He says it the way you\'d describe a room after everything has been taken out of it. — Clean file, counsellor.',
      }[outcomeOf('retrieval')] || 'Counsellor.',
    };
    return T;
  },

  /* --------------------------- THE PERSONNEL FILE --------------------------- */
  // Not a person, which is why it is reached through a prop's `tree` rather
  // than an NPC. It is still the thing you have the conversation with.
  personnel() {
    const T = { who: 'YOUR PERSONNEL FILE', spr: 'dossier', nodes: {} };
    const stage = currentStage('reviews');

    if (isDone('reviews')) {
      T.start = 'a';
      T.nodes.a = {
        text: {
          sign_off: 'Four reviews. Four signatures. The last one is fresher than the others and in about a week you will not be able to tell which.',
          refuse: 'Three reviews and a blank. The blank has not filled itself in overnight, which you had privately expected it to.',
          read: 'Three reviews, read. The file is exactly as heavy as it was.',
        }[outcomeOf('reviews')] || 'The file is closed.',
      };
      return T;
    }

    if (!stage || stage.type !== 'resolve') {
      T.start = 'a';
      T.nodes.a = {
        text: 'Three annual reviews, one per rank, in one hand, and the hand is yours. Behind you in the plaza, at three different distances, three people are standing very still and have been since you opened it.',
      };
      return T;
    }

    T.start = 'a';
    T.nodes.a = {
      text: 'The plaza is empty. The file is open at the fourth form, which is blank, and which has the current year printed on it, and which has your name in the REVIEWER box as well as the REVIEWED one.',
      choices: [
        { tag: 'SIGN', label: 'Sign the fourth one. At the bottom, in the box.', to: 'do_sign' },
        { label: 'Leave it blank.', to: 'do_refuse' },
        { label: 'Read the first three properly.', to: 'do_read' },
        { label: 'Close it.', to: null },
      ],
    };
    T.nodes.do_sign = {
      text: 'You sign it the way you signed the other three. The file closes itself. It is not heavier and it is not lighter and the plaza stays empty, and somewhere above you the eleventh floor stays exactly as lit as it was.',
      fx: () => qResolve('reviews', 'sign_off'),
    };
    T.nodes.do_refuse = {
      text: 'You put the pen down on the chair. Nothing enforces it. Nobody comes. A blank in a file this old turns out to be the loudest thing on the floor, and it stays blank the entire time you are looking at it, which you keep checking.',
      fx: () => qResolve('reviews', 'refuse'),
    };
    T.nodes.do_read = {
      text: 'It takes longer than the fighting did. They are not bad reviews. They are accurate, and in places generous, and every one of them describes somebody who was going to be fine — and all three were written by you, about you, in a building that only ever asked you for one opinion and got it three times.',
      fx: () => qResolve('reviews', 'read'),
    };
    return T;
  },

  /* ----------------------------- IRIS NAKAMURA ----------------------------- */
  // The same woman on both layers, deliberately. On THE STREET she is fighting
  // an eviction. On THE FLOOR she is setting out chairs in the one district the
  // building never owned. She does not recognise you on the second one, and she
  // does not need to.
  iris() {
    if (CASE_HOOKS.layer() === 'floor') return irisFloor();

    const stage = currentStage('rivera');
    const phase = !started('rivera') || (stage && stage.type === 'talk' && !knows('flats_iris')) ? 'intake'
      : isDone('rivera') ? 'after'
        : (stage && stage.type === 'resolve') || knows('flats_notices', 'flats_sale', 'flats_relocation') ? 'report'
          : 'working';

    const T = { who: 'Iris Nakamura', spr: 'iris', nodes: {} };

    if (phase === 'intake') {
      T.start = 'a';
      T.nodes.a = {
        text: 'You\'re the one from over the Wok. — She does not look up from the clipboard. — Don\'t be flattered, I asked. I have asked about every lawyer within a mile and you are the eleventh.',
        to: 'b',
      };
      T.nodes.b = {
        text: 'Thirty units. Everybody got the same paper on the same Saturday. Three days. Three days is Tuesday, and it is already Monday, and half this building works Tuesdays.',
        choices: [
          { label: 'How long have you been at this?', to: 'c' },
          { label: 'Has anybody signed anything?', to: 'c' },
        ],
      };
      T.nodes.c = {
        text: 'Six weeks. I have all thirty on one sheet, which took four of those weeks, because the first thing everybody says is that it is only them. — She finally looks up. — Nobody has signed anything. I told them not to sign anything. Was that right?',
        fx: () => { learn('flats_iris'); },
        choices: [
          { label: '"That was right. Keep telling them."', to: 'd' },
          { label: '"Who is the buyer?"', to: 'd' },
        ],
      };
      T.nodes.d = {
        text: 'She writes something on the clipboard and does not tell you what. — I should say this now. There is no money. There was never going to be money. I am not going to pretend for two days and then apologise.',
      };
      return T;
    }

    if (phase === 'working') {
      T.start = 'a';
      T.nodes.a = {
        text: 'Tuesday is Tuesday whatever either of us does about it.',
        choices: [
          { label: 'Still working. I\'ll come back.', to: null },
          { tag: 'PROGRESS', label: 'Tell her what you have so far.',
            if: () => knowsAny('flats_notices', 'flats_sale', 'flats_relocation'), to: 'b' },
        ],
      };
      T.nodes.b = { text: 'Write it down for me. Not for me — for the sheet. Everything goes on the sheet.' };
      return T;
    }

    if (phase === 'report') {
      T.start = 'a';
      T.nodes.a = { text: 'Go on then. I have had eleven versions of this conversation and I can tell which one it is by about the fourth word, so you can skip to the fourth word.', to: 'b' };
      T.nodes.b = {
        text: 'The notices are bad. Served Saturday, no proof of service — that is not three days, that is nothing at all, and every one of the thirty is the same defect. The building is in escrow and the sale needs it empty, which is why it was thirty at once. And there is an ordinance nobody has read to any of you.',
        choices: [
          { tag: 'HONEST', label: 'Tell her about Halloran\'s four thousand.',
            if: () => knows('flats_halloran'), to: 'honest' },
          { label: 'Get to what happens now.', to: 'options' },
        ],
      };
      T.nodes.honest = {
        text: 'Four thousand. — She says the number back like she is checking it against something. — For nothing? — For nothing. For not being here. — And you are telling me. — I\'m telling you. — She writes that on the clipboard too.',
        to: 'options',
      };
      T.nodes.options = {
        text: 'So. What happens now.',
        choices: [
          { tag: 'PRO BONO', label: 'Thirty answers, filed tomorrow, for nothing.',
            if: () => knows('flats_notices'), to: 'fight' },
          { tag: '41-7', label: 'Trade the defect for relocation and time. Take a fee out of it.',
            if: () => knows('flats_relocation', 'flats_sale'), to: 'settle' },
          { label: 'Walk it down to legal aid.', to: 'refer' },
          { label: 'Not today. You have a rent day of your own.', to: null },
        ],
      };
      T.nodes.fight = {
        text: 'She puts the clipboard down, which you have not seen her do. — All thirty. — All thirty. — And what does that cost me. — Nothing. That is the part I need you to hear, because in about a week somebody is going to tell you it cost you something.',
        fx: () => qResolve('rivera', 'fight'),
      };
      T.nodes.settle = {
        text: 'A hundred and ten days and the relocation money, and everybody still goes. — Everybody still goes. — She is quiet for a second. — I am going to take it, and I am going to be angry about it, and those are not connected. Write it up.',
        fx: () => qResolve('rivera', 'settle'),
      };
      T.nodes.refer = {
        text: 'Legal aid. — She nods slowly. — I called them in week two. They have nine slots. Do you want to pick the nine, or shall I? — She does not say it cruelly. That is somehow the worst available version of it.',
        fx: () => qResolve('rivera', 'refer'),
      };
      return T;
    }

    T.start = 'a';
    T.nodes.a = {
      text: {
        fight: 'Twenty-two of the thirty are still in. The other eight took the money before you filed and I am not allowed to be angry about that, so I am angry about the eight who are allowed.',
        settle: 'Everybody\'s out by the fourteenth. Everybody\'s got the relocation. The centre is doing a thing on the Sunday, which is not a party, but there will be food.',
        refer: 'Nine got seen. — Iris — No, it is nine more than none. I am practising saying it like that.',
        consult: 'She looks at you for about four seconds and goes back to the clipboard, and that is the entire conversation, and it is going to be the entire conversation every time.',
        failed: 'The sheriff posted Tuesday. — I know. — Thirty chairs. Nine people. I had put out thirty.',
      }[isFailedCase('rivera') ? 'failed' : outcomeOf('rivera')] || 'Busy. Always busy.',
    };
    return T;
  },

  /* ------------------------------- HALLORAN -------------------------------- */
  halloran() {
    const T = { who: 'W. Halloran', spr: 'halloran', nodes: {} };
    if (isDone('rivera')) {
      T.start = 'a';
      T.nodes.a = {
        text: {
          consult: 'Pleasure doing nothing with you. — He means it warmly, which is the trouble with him.',
          fight: 'Thirty answers. — He says it the way you\'d note the weather. — My client will spend more on the continuance than the offer was. You understand that is not a threat, it is just the arithmetic, and the arithmetic is why I made the offer.',
          settle: 'Sensible. Everybody gets something and nobody gets to feel wonderful about it, which in my experience is what a deal is.',
          refer: 'Legal aid. — He almost laughs and then does not, which you appreciate more than you want to.',
        }[outcomeOf('rivera')] || 'Counsellor.',
      };
      return T;
    }
    T.start = 'a';
    T.nodes.a = {
      text: 'You would be the eleventh lawyer. — He is standing on the good side of the road in a coat that has been rained on precisely never. — Halloran. I act for the buyer. I am not going to pretend I am not, because you will find out inside a day and then everything else I say gets discounted.',
      choices: [
        { label: 'What do you want?', to: 'offer' },
        { label: 'Nothing to say to you.', to: null },
      ],
    };
    T.nodes.offer = {
      text: 'Four thousand, to consult on tenant relations. — On what? — On tenant relations. — He lets that sit exactly long enough. — There is no deliverable, counsellor. There is no report. You would not be asked to do anything at all, and that is not me being coy, that is the entire product.',
      fx: () => { learn('flats_halloran'); },
      choices: [
        { tag: 'TAKE IT', label: 'Take the four thousand.',
          if: () => isActive('rivera') && (currentStage('rivera') || {}).type === 'resolve',
          showLocked: true, lockedNote: 'you have not heard Iris out yet',
          to: 'take' },
        { label: '"That is a conflict and you know it."', to: 'conflict' },
        { label: 'Walk away.', to: null },
      ],
    };
    T.nodes.conflict = {
      text: 'It is not, and I do know it. — He is genuinely pleased to be arguing. — You have no client on that building. Retain nobody, and there is nothing to conflict with. The rule is about loyalty, and loyalty is a thing you have to have taken on first. That is not a loophole, counsellor, that is the actual shape of the rule, and you knew that before I said it.',
      choices: [
        { tag: 'TAKE IT', label: 'Take the four thousand.',
          if: () => isActive('rivera') && (currentStage('rivera') || {}).type === 'resolve',
          showLocked: true, lockedNote: 'you have not heard Iris out yet',
          to: 'take' },
        { label: 'Leave him on the good side of the road.', to: null },
      ],
    };
    T.nodes.take = {
      text: 'He does not shake your hand, which you notice and will keep noticing. The cheque is a firm cheque with a matter number on it and the matter number is not the Rivera Block, and by Thursday you could not tell anybody what you were paid for, because you were not paid for anything, and that was the arrangement and you understood it perfectly at the time.',
      fx: () => qResolve('rivera', 'consult'),
    };
    return T;
  },

  /* ------------------------------ DEE FERRARO ------------------------------ */
  dee() {
    const stage = currentStage('ferraro');
    const phase = !started('ferraro') || (stage && stage.type === 'talk' && !knows('dee_injury')) ? 'intake'
      : isDone('ferraro') ? 'after'
        : (stage && stage.type === 'resolve') || knows('dee_liability', 'kest_capping', 'kest_lien') ? 'report'
          : 'working';

    const T = { who: 'Dee Ferraro', spr: 'dee', nodes: {} };

    if (phase === 'intake') {
      T.start = 'a';
      T.nodes.a = {
        text: 'Doc said you\'d come. — She turns her whole body to look at you, feet and all, the way you turn when the alternative is turning your head. — I drive the hook truck. Ten years. Ten years and I have never once been the one who got hit.',
        to: 'b',
      };
      T.nodes.b = {
        text: 'Guy came across Alameda and Seventh doing about forty and I was already in the box. I remember the noise and then I remember the airbag and then I remember being annoyed about the airbag, which the doc says is a normal thing to remember.',
        choices: [
          { label: 'What did the doctor actually find?', to: 'c' },
          { label: 'How are you managing at work?', to: 'c' },
        ],
      };
      T.nodes.c = {
        text: 'Three discs. Which sounds like a number until somebody explains it and then it sounds like a job. — She does the whole-body turn again, toward the yard. — I cannot check a blind spot. That is the job. That is the entire job.',
        fx: () => { learn('dee_injury'); },
        choices: [
          { label: 'Don\'t give a recorded statement to anybody. I\'ll look at it.', to: 'd' },
          { label: 'Who else have you talked to about this?', to: 'vonnie' },
        ],
      };
      T.nodes.vonnie = {
        text: 'The bench lady called me. Twice. She knew my name before I said it, which I did not love. — Is that bad? — I don\'t know yet. — Okay. Okay, that\'s honest at least.',
        to: 'd',
      };
      T.nodes.d = {
        text: 'Doc says you\'re good and Doc says he\'ll handle the treating side so I don\'t have to think about it. — She says it the way people say things they have been told to say, without any idea that that is what she is doing.',
      };
      return T;
    }

    if (phase === 'working') {
      T.start = 'a';
      T.nodes.a = {
        text: 'Still upright. Still not turning my head. — She has been standing in the same place long enough that the yard dog has stopped registering her.',
        choices: [
          { label: 'Still working. I\'ll come back when I have it straight.', to: null },
          { tag: 'PROGRESS', label: 'Tell her what you have so far.',
            if: () => knowsAny('dee_liability', 'kest_capping', 'kest_lien'), to: 'b' },
        ],
      };
      T.nodes.b = {
        text: 'That is more than anybody has told me and I have been to four appointments. — Four? — Doc likes appointments.',
      };
      return T;
    }

    if (phase === 'report') {
      T.start = 'a';
      T.nodes.a = {
        text: 'Okay. Give it to me standing up. I can\'t nod so don\'t wait for one.',
        to: 'b',
      };
      T.nodes.b = {
        text: 'The liability is clean — the damage on that cab is a side impact and he came across the intersection to make it. That is the good part. The rest of it is about the man who sent you to me.',
        choices: [
          { tag: 'THE LIEN', label: '"He treats you, he bills it on a lien at triple, and it comes out of your share — not mine."',
            if: () => knows('kest_lien'), to: 'lien' },
          { tag: 'THE ARRANGEMENT', label: '"He keeps referring as long as I keep sending clients back to him."',
            if: () => knows('kest_capping'), to: 'lien' },
          { label: 'Say nothing about Kestenbaum. Run it the way he set it up.', to: 'play' },
        ],
      };
      T.nodes.lien = {
        text: 'She works it out faster than you expected her to, because it is her money and people are quick about their own money. — So the more he treats me, the less I get. — Yes. — And the more he treats me, the more he sends you. — Yes. — Huh. And you told me. — Yeah. — Why?',
        choices: [
          { label: '"Because you\'d have found out from the settlement statement."', to: 'options' },
          { label: '"Because I want to still be doing this in five years."', to: 'options' },
        ],
      };
      T.nodes.options = {
        text: 'So what do we do.',
        choices: [
          { tag: 'CLEAN', label: 'Take it. Treatment goes wherever her own doctor sends her.',
            if: () => knows('kest_lien', 'dee_liability'), to: 'clean' },
          { tag: 'REPORT', label: 'Take the ledger to the bar. Forty-one names is not a misunderstanding.',
            if: () => knows('kest_lien', 'kest_capping'), to: 'report' },
          { label: 'Run it his way anyway. It pays, and rent is on the first.', to: 'play' },
          { label: 'Give the file back. This is more than you can carry right now.', to: 'decline' },
        ],
      };
      T.nodes.clean = {
        text: 'Then we do that. — She looks at the yard for a second. — He is going to be so nice about it. That is the thing about him. He is going to be so nice about it.',
        fx: () => qResolve('ferraro', 'clean'),
      };
      T.nodes.report = {
        text: 'Forty-one. — Forty-one. — She thinks about it for a long moment, the way somebody thinks about a thing that is going to cost them something they cannot itemize. — Do it. I have to keep driving on this street. Do it anyway.',
        fx: () => qResolve('ferraro', 'report'),
      };
      T.nodes.play = {
        text: 'Then it\'s handled? — It\'s handled. — Good. Good, because I have been trying not to think about it and it turns out I am extremely good at that.',
        fx: () => qResolve('ferraro', 'play'),
      };
      T.nodes.decline = {
        text: 'She takes the folder back with both hands, because one hand would mean turning. — You could\'ve just not told me any of it. — I know. — Yeah. That\'s what I mean.',
        fx: () => qResolve('ferraro', 'decline'),
      };
      return T;
    }

    // after
    T.start = 'a';
    T.nodes.a = {
      text: {
        play: 'Doc\'s got me on three a week now. Is that a lot? — She asks it lightly. She is not asking you lightly.',
        clean: 'New doc. Different building, no posters in the waiting room. She told me to stop lifting for six weeks and did not give me a card to give anybody.',
        report: 'Bonilla won\'t look at me. Neither will the guy at the parts counter. — Dee — No, I said do it. I\'m not taking it back. I\'m just telling you what it\'s like.',
        decline: 'The bench lady got it. She calls me every Friday whether there\'s anything to say or not. I think that\'s the service.',
        failed: 'The letter came on a Tuesday. It says the file is closed. — I know. — You said six days. I counted them. I was counting them.',
      }[isFailedCase('ferraro') ? 'failed' : outcomeOf('ferraro')] || 'Thanks for stopping.',
    };
    return T;
  },

  /* ----------------------------- DR KESTENBAUM ----------------------------- */
  kestenbaum() {
    const T = { who: 'Dr. Kestenbaum', spr: 'kestenbaum', nodes: {} };
    if (isDone('ferraro')) {
      T.start = 'a';
      T.nodes.a = {
        text: {
          play: 'I have two more for you. A rear-ender and a slip. — He says it the way you\'d offer somebody a chair.',
          clean: 'No hard feelings whatsoever. Truly. — He shakes your hand with both of his and you notice that he has stopped saying your name.',
          report: 'The letter came from the board on Monday. — He is still smiling. That is the part you will think about. — Forty-one people, counsellor. Do you know how many of them still cannot sleep on their left side?',
          decline: 'Aslanian took it. She sends me everything. — He shrugs, comfortably. — Somebody was always going to.',
        }[outcomeOf('ferraro')] || 'Walk-ins welcome.',
      };
      return T;
    }
    T.start = 'a';
    T.nodes.a = {
      text: 'Counsellor! — He says it like a diagnosis he is pleased about. — Ferraro. Good case. Clean liability, real injury, sympathetic plaintiff, and a defendant with a policy. You do not get all four. I have been doing this since 1997 and you do not get all four.',
      choices: [
        { label: 'Why me? You don\'t know me.', to: 'why' },
        { tag: 'CASE', label: 'Ask how the treatment is being billed.',
          if: () => isActive('ferraro'), to: 'bill' },
        { label: 'Thanks for the referral.', to: null },
      ],
    };
    T.nodes.why = {
      text: 'Because you are new and you are hungry and you are four blocks away. — He is not embarrassed by any of that. — Also because the last three offices I sent people to stopped sending them back.',
      choices: [
        { label: '"Sent them back."', to: 'bill' },
      ],
    };
    T.nodes.bill = {
      text: 'On a lien. Nobody on this street has fifty dollars for a visit, so I treat, I hold the bill, and I get paid out of the settlement. Standard. Everybody does it. — And the referrals? — He spreads his hands, genuinely delighted to be asked. — I send you cases, your people treat with me, I send you more cases. That is not a scheme, counsellor, that is a neighbourhood.',
      fx: () => { learn('kest_capping'); },
      choices: [
        { label: '"And the rate?"', to: 'rate' },
        { label: 'Let it go for now.', to: null },
      ],
    };
    T.nodes.rate = {
      text: 'The rate is the rate. — It is not a number he is going to say out loud, and the way he does not say it is the most informative thing that has happened to you today. — Look at what I do for these people. Look at what the alternative is for these people. Then come back and ask me about the rate.',
    };
    return T;
  },

  /* ------------------------------ THE YARD MAN ----------------------------- */
  yardman() {
    const T = { who: 'The Yard Man', spr: 'yardman', nodes: {} };
    T.start = 'a';
    T.nodes.a = {
      text: 'Evening. — He has a clipboard. There is nothing on the clipboard. He holds it the way a man holds a thing he has held for thirty years without needing it. — Lot closes at six.',
      choices: [
        { label: 'What time is it now?', to: 'time' },
        { tag: 'THE CAR', label: 'Ask about the one that is not running.',
          if: () => knows('mr_yours'), showLocked: true,
          lockedNote: 'you have not found it yet', to: 'car' },
      ],
    };
    T.nodes.time = {
      text: 'Coming up on six. — He does not look at anything to establish that. — It has been coming up on six for a while now. I find you stop minding.',
    };
    T.nodes.car = {
      text: 'Second row. Blue one. — He does not look that way either. — That one is not impounded, counsellor. That one is HELD. There is a difference and the difference is that an impound is waiting on a fee and a hold is waiting on a person.',
      choices: [
        { label: 'What does it take to get it out?', to: 'release' },
      ],
    };
    T.nodes.release = {
      text: 'A signature. — That is it? — That is all it has ever been. Nothing leaves this lot without one and nothing has ever left this lot, and I would not want you to think those two facts are unrelated. A release is a filing, same as anything else. Somebody has to hand it in.',
      fx: () => { learn('mr_release'); },
      choices: [
        { tag: 'SIGN', label: 'Sign the release for the car with your name on it.',
          if: () => knows('mr_release', 'mr_yours'), to: 'do_sign' },
        { tag: 'THE TAGS', label: 'Match the key tags to the tickets first. Find out who else is in here.',
          if: () => knows('mr_keyring'), showLocked: true,
          lockedNote: 'you would need the ring off the alley floor', to: 'do_read' },
        { label: 'Nothing. Walk out through the gate.', to: 'do_leave' },
        { label: 'Not yet.', to: null },
      ],
    };
    T.nodes.do_sign = {
      text: 'He turns the clipboard around and there is a form on it now, and you do not think there was one before. You sign on the line and he tears the ticket along the perforation and hands you the short half without a word, and behind you, in the second row, an engine that has not turned over in forty years turns over on the first try.',
      fx: () => qResolve('impound', 'sign'),
    };
    T.nodes.do_read = {
      text: 'He steps aside. It takes a long time. Forty-one tags, forty-one tickets, forty-one names, and every single one of them a person who came down here to get their car back and is on the list of people who did not. — You are the first one to count them, he says. — Somebody had to. — He says: that is what they all put on the form.',
      fx: () => qResolve('impound', 'read'),
    };
    T.nodes.do_leave = {
      text: 'He raises the clipboard about an inch, which is the whole of the goodbye. — Storage runs sixty-five a day, counsellor. In case you were doing the arithmetic. — I wasn\'t. — He says: you will.',
      fx: () => qResolve('impound', 'leave'),
    };
    return T;
  },

  /* -------------------------------- HECTOR --------------------------------- */
  hector() {
    const T = { who: 'Hector (newsstand, est. 1991)', spr: 'hector', nodes: {} };
    T.start = 'a';
    T.nodes.a = {
      text: 'Papers, lighters, gum. No, I don\'t validate. Nobody validates. That\'s a thing people say to lawyers to watch what happens to their face.',
      choices: [
        { label: 'Just browsing.', to: null },
        { tag: 'CASE', label: 'Ask about the Golden Wok on The Strand.',
          if: () => isActive('ruiz'), to: 'wok' },
        { label: 'Ask what he sees from here.', to: 'sees' },
      ],
    };
    T.nodes.sees = {
      text: 'Everything, and I mean that as a complaint. Thirty-four years on this corner. I have watched every one of you go up those steps fast and come down slow.',
    };
    T.nodes.wok = {
      text: 'The Wok. Sure. County car came out twice in one week — I know the car, it parks on my hydrant. First time the guy was in there forty minutes. Second time he was in and out in six. Six minutes. You don\'t inspect a kitchen in six minutes, you collect something in six minutes.',
      fx: () => { learn('wok_inspection'); },
      choices: [
        { label: 'Anything else about them?', to: 'ins' },
        { label: 'Thanks, Hector.', to: null },
      ],
    };
    T.nodes.ins = {
      text: 'They\'re covered, if that\'s what you\'re circling. Guy from the carrier buys a paper off me every quarter and complains about the premium on that building. There\'s money in there. — Doesn\'t mean there\'s a case in there. You know the difference. I hope you know the difference.',
      fx: () => { learn('wok_insured'); },
    };
    return T;
  },

  /* ------------------------------ NIGHT CLERK ------------------------------ */
  clerk() {
    const T = { who: 'The Night Clerk', spr: 'clerk', nodes: {} };
    T.start = 'a';
    T.nodes.a = {
      text: 'Good evening. Department 13 is open. Department 13 is always open — that is not a boast, it is a filing status.',
      choices: [
        { label: 'Where is everybody?', to: 'who' },
        { tag: 'LETTER', label: 'Show the letter.',
          if: () => knows('unsent_hand'), showLocked: true,
          lockedNote: 'you have nothing to show', to: 'letter' },
      ],
    };
    T.nodes.who = {
      text: 'Working. — All of them? — All of them. You will find that a building does not need people in it to be occupied.',
    };
    T.nodes.letter = {
      text: 'Ah. — He does not take it. He looks at it the way a pharmacist looks at a prescription he has filled many, many times. — Eleven signatures. That is a lot of nearly.',
      choices: [
        { label: 'Why did it never send?', to: 'why' },
      ],
    };
    T.nodes.why = {
      text: 'Because writing is not filing. A resignation is not effective when you mean it. It is effective when someone walks it to a window and hands it in, and there has been nobody at the window. — He pauses. — There is somebody at the window now.',
      fx: () => { learn('unsent_clerk'); },
      choices: [
        { label: 'Whose is it?', to: 'whose' },
      ],
    };
    T.nodes.whose = {
      text: 'He turns the page over without touching the front. On the back, in pencil, in a hand that banned midnight meetings and then failed to survive one: P. LOCKE. — She got to eleven-fifty-nine, counsellor. Most of them do not get past three.',
      fx: () => { learn('unsent_name'); },
      choices: [
        { label: 'And if I file it?', to: 'file_q', if: () => knows('unsent_name') },
      ],
    };
    T.nodes.file_q = {
      text: 'Then it is filed. — And? — And it is filed. I am a clerk. You are asking me what it MEANS, and I am telling you what the window does.',
      choices: [
        { tag: 'FILE', label: 'File it. It has been forty years.',
          if: () => knows('unsent_clerk', 'unsent_name'), to: 'do_file' },
        { label: 'Keep it. You are not ready to give it up.', to: 'do_keep' },
        { label: 'Burn it in front of him.', to: 'do_burn' },
        { label: 'Not yet.', to: null },
      ],
    };
    T.nodes.do_file = {
      text: 'He stamps it. The stamp is very loud. He slides a copy back across the counter — a copy for the file, counsellor, always keep a copy — and for the first time all night, somewhere far above you, a light goes off instead of on.',
      fx: () => qResolve('unsent', 'file'),
    };
    T.nodes.do_keep = {
      text: 'He does not argue. He writes something in a ledger, and the something is short. — People do keep them, he says. That is rather how we got four hundred.',
      fx: () => qResolve('unsent', 'keep'),
    };
    T.nodes.do_burn = {
      text: 'It goes up fast, the way forty-year-old paper does, and he watches it with no expression whatsoever, and when it is ash he says: she will write another one. — She is dead. — He says: yes.',
      fx: () => qResolve('unsent', 'burn'),
    };
    return T;
  },
};

export function npcDialogue(id) {
  const fn = NPC_TREES[id];
  return fn ? fn() : null;
}
