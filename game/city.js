"use strict";
// ============================== THE CITY ==============================
// Regions on one global tile grid. `ox`/`oy` are that region's origin in global
// TILES — Courthouse Square owns gx 0..39, The Strand owns gx 40..75, and rows
// 20..23 are open on both sides of the seam, so the road runs straight through
// with nothing to load and no transition to sit through.
//
// Geometry is authored ONCE. `layers.street` and `layers.floor` dress it.
// `sub` rewrites tiles per layer; the rest is content.

export const REGIONS = [
  {
    id: 'courthouse',
    name: 'COURTHOUSE SQUARE',
    ox: 0, oy: 0,
    rows: [
      '########################################',
      '#......................................#',
      '#.....############################.....#',
      '#.....############################.....#',
      '#.....############################.....#',
      '#.....############################.....#',
      '#.....############################.....#',
      '#.....############################.....#',
      '#.....############################.....#',
      '#.....############################.....#',
      '#.....####www####wwww####www######.....#',
      '#.....############++++############.....#',
      '#.................ssss.................#',
      '#.................ssss.................#',
      '#.................ssss.................#',
      '#.......T.....T..........T.....T.......#',
      '#.........bb................bb.........#',
      '#...................k..................#',
      '#......................................#',
      '#......................................#',
      '#=======================================',
      '#=======================================',
      '#---------------------------------------',
      '#=======================================',
      '#......................................#',
      '#.##############......###############..#',
      '#.#wwww####wwww#......##www####www###..#',
      '#.#####++#######......######++#######..#',
      '#......................................#',
      '########################################',
    ],
    layers: {
      street: {
        greet: 'COURTHOUSE SQUARE. Filing window closes at four. The steps are where the work is.',
        props: [
          { id: 'ch_doors', tx: 19, ty: 12, spr: 'sign',
            label: '[E] Superior Court — Dept. 13',
            text: 'SUPERIOR COURT — DEPARTMENT 13. The docket is posted behind glass, sun-bleached to the point of prophecy. Hon. M. BANE presiding. He has been presiding since before you were born.' },
          { id: 'ch_kiosk', tx: 20, ty: 17, spr: 'board', label: '[E] newsstand',
            text: 'The newsstand sells three papers, four lighters and a rack of business cards from attorneys who could afford the rack. Yours is not on it.' },
          { id: 'ch_bench', tx: 28, ty: 16, spr: 'sign', label: '[E] the bench nobody sits on',
            text: 'A brass plate on the backrest: IN MEMORY OF THOSE WHO SETTLED. Somebody has scratched an addendum: AND WERE RIGHT TO.' },
          { id: 'ch_window', tx: 22, ty: 12, spr: 'sign', label: '[E] the clerk\'s filing window',
            repeat: true,
            text: 'A slot, a bell, and a laminated sign reading NO EXCEPTIONS that has been laminated twice. Everything that is going to happen to anybody here goes through this slot first.' },
          { id: 'ch_bonds', tx: 8, ty: 27, spr: 'sign', label: '[E] Ace Bail Bonds — 24 HRS',
            text: 'ACE BAIL BONDS — 24 HRS — SE HABLA ESPAÑOL. A hand-lettered addition: AND WE MEAN 24.' },
        ],
        pickups: [
          { id: 'ch_flyer', tx: 8, ty: 18, spr: 'dossier', item: 'flyer',
            name: 'FLYER: NOTARY · TAXES · DIVORCE', note: 'Somebody else already had your idea. Their phone number is torn off. All of them.' },
          { id: 'ch_card', tx: 34, ty: 16, spr: 'dossier', item: 'card',
            name: "BONDSMAN'S CARD", note: 'A referral source, if you can stomach it. You can.' },
        ],
        npcs: [
          { id: 'hector', name: 'Hector', spr: 'hector', tx: 22, ty: 17,
            label: '[E] Hector (newsstand)' },
          { id: 'delgado', name: 'Arturo Delgado', spr: 'delgado', tx: 16, ty: 14,
            label: '[E] the man on the steps' },
        ],
        actors: [
          { id: 'ch_civ1', type: 'civ', tx: 14, ty: 18 },
          { id: 'ch_civ2', type: 'civ', tx: 26, ty: 19 },
          { id: 'ch_srv1', type: 'server', tx: 34, ty: 22 },
        ],
      },
      floor: {
        // the trees are gone and the newsstand is a stump of itself
        sub: { T: 'x', k: 'x' },
        greet: 'COURTHOUSE SQUARE. No cars. No sun. Department 13 is lit, and it is in session.',
        props: [
          { id: 'ch_doors', tx: 19, ty: 12, spr: 'sign',
            label: '[E] Department 13 — IN SESSION',
            text: 'The docket behind the glass lists one matter. It has listed one matter for a very long time. The caption is your name, and under COUNSEL FOR, also your name.',
            fact: 'unsent_docket' },
          { id: 'ch_kiosk', tx: 20, ty: 17, spr: 'board', label: '[E] what is left of the newsstand',
            text: 'The papers are still stacked. Every one of them is the same edition. You check four before you stop checking.' },
        ],
        npcs: [
          { id: 'clerk', name: 'The Night Clerk', spr: 'clerk', tx: 21, ty: 13,
            label: '[E] the Night Clerk' },
        ],
        pickups: [
          { id: 'ch_letter', tx: 20, ty: 16, spr: 'dossier', item: 'letter',
            name: 'AN UNSENT RESIGNATION LETTER', note: 'Not your handwriting. The date is blank. The signature line has been signed and scratched out eleven times.',
            fact: 'unsent_hand' },
        ],
        actors: [
          { id: 'ch_unb1', type: 'unbilled', tx: 33, ty: 18 },
        ],
      },
    },
  },
  {
    id: 'strand',
    name: 'THE STRAND',
    ox: 40, oy: 0,
    rows: [
      '####################################',
      '#..................................#',
      '#.################################.#',
      '#.################################.#',
      '#.################################.#',
      '#.################################.#',
      '#.################################.#',
      '#.################################.#',
      '#.##wwww###wwww###wwww###wwww#####.#',
      '#.####++######++######++##########.#',
      '#.....T.........T.........T........#',
      '#..................................#',
      '#........bb..............bb........#',
      '#..................................#',
      '#.......####################.......#',
      '#.......####################.......#',
      '#.......###wwww###wwww###ww#.......#',
      '#.......#########++#########.......#',
      '#..................................#',
      '#..................................#',
      '===================================#',
      '===================================#',
      '-----------------------------------#',
      '===================================#',
      '#..................................#',
      '#.################################.#',
      '#.##wwww###wwww###wwww###wwww#####.#',
      '#.########++############++########.#',
      '#..................................#',
      '####################################',
    ],
    layers: {
      street: {
        greet: 'THE STRAND. Small business, small claims. Your office is the one over the Golden Wok.',
        props: [
          { id: 'st_office', tx: 17, ty: 17, spr: 'sign',
            label: '[E] SUITE 2B — above the Golden Wok',
            text: 'A strip of masking tape on the buzzer, and on the tape, in marker, your name. Under it someone has added ESQ. with a caret. You did not do that. You have decided to like it. Taped inside the glass, where a lease is required to be posted: GOLDEN WOK HOLDINGS LLC, LANDLORD.',
            fact: 'wok_landlord' },
          { id: 'st_board', tx: 6, ty: 13, spr: 'board', label: '[E] corkboard',
            text: 'LAUNDROMAT CORKBOARD: a lost cat, a bass amp, three tabs torn off a card that reads EVICTION? KNOW YOUR RIGHTS — and four staples in a rectangle, holding nothing. Whatever was posted there was county-yellow; there is a strip of it still under the left staple, and the printed date on it has not come yet.',
            fact: 'wok_notice' },
          { id: 'st_endday', tx: 20, ty: 18, spr: 'sign', repeat: true, endDay: true,
            label: '[E] go up to Suite 2B — end the day',
            text: 'Up the stairs beside the Wok, past the smell, to a folding table and a cot you have decided not to describe as a cot.' },
        ],
        npcs: [
          { id: 'ruiz', name: 'Marisol Ruiz', spr: 'ruiz', tx: 8, ty: 12,
            label: '[E] the woman outside the laundromat' },
        ],
        pickups: [
          { id: 'st_rent', tx: 29, ty: 11, spr: 'dossier', item: 'rent',
            name: 'RENT NOTICE — DUE THE 1st', note: 'Eleven hundred, and the Wok is not negotiable about it.' },
        ],
        actors: [
          { id: 'st_civ1', type: 'civ', tx: 24, ty: 11 },
          { id: 'st_srv1', type: 'server', tx: 30, ty: 21 },
        ],
      },
      floor: {
        sub: { T: 'x' },
        greet: 'THE STRAND. Every storefront is lit, and every storefront is a different year.',
        props: [
          { id: 'st_office', tx: 17, ty: 17, spr: 'sign',
            label: '[E] SUITE 2B — the door is open',
            text: 'The tape on the buzzer is yellow and curling and your name is still on it, which is the part you cannot make work, because in this version you never resigned and never rented it. Inside, the desks go back further than the room should allow, and you open the nearest drawer, and then the next one, and then eleven more. Every drawer has a letter in it. None of them have been sent.',
            fact: 'unsent_drawer' },
          { id: 'st_board', tx: 6, ty: 13, spr: 'board', label: '[E] corkboard',
            text: 'The cork is furred with staples. Every notice has been taken down. The tabs are all still there — every phone number intact, nobody ever tore one off.' },
        ],
        pickups: [
          { id: 'st_ledger', tx: 6, ty: 12, spr: 'dossier', item: 'ledger',
            name: 'A TIME LEDGER, STILL RUNNING', note: 'Entries in your hand, at six-minute intervals, for work you have not done yet.' },
        ],
        actors: [
          { id: 'st_unb1', type: 'unbilled', tx: 20, ty: 18 },
          { id: 'st_unb2', type: 'unbilled', tx: 27, ty: 21 },
        ],
      },
    },
  },
];

// Where each path starts. Both are on the same street, forty tiles apart.
export const SPAWN = {
  street: { x: 46 * 40 + 20, y: 19 * 40 + 20 },   // The Strand, outside your own door
  floor: { x: 20 * 40 + 20, y: 18 * 40 + 20 },   // Courthouse Square, under Dept. 13
};
