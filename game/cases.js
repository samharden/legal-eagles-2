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
