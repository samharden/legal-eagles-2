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

const NPC_TREES = {

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
