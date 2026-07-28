"use strict";
// ============================== THE CITY ==============================
// Regions on one global tile grid. `ox`/`oy` are that region's origin in global
// TILES, and the whole city is laid out ONCE, up front, so no district ever has
// to move again — a region's origin is baked into every save's deltas and into
// SPAWN, and shifting one after it has content is the expensive mistake:
//
//        gx 0..35        gx 36..75          gx 76..111
//   gy    0..29  ·       THE TOWER DISTRICT · THE ANNEX
//   gy   30..59  THE FLATS · COURTHOUSE SQ  · THE STRAND
//   gy   60..89  ·       MOTOR ROW          · ·
//
// Everything is 30 tiles tall so the bands stack flush; unbuilt cells are solid
// by default, so a district whose neighbour does not exist yet simply has a wall
// there and gains an exit the day that neighbour lands. Openings are cut on both
// sides in advance — the courthouse already has its doors to The Flats and the
// Tower District, and they are walls until those regions arrive.
//
// Geometry is authored ONCE. `layers.street` and `layers.floor` dress it.
// `sub` rewrites tiles per layer; the rest is content.

export const REGIONS = [
  {
    id: 'courthouse',
    name: 'COURTHOUSE SQUARE',
    ox: 36, oy: 30,
    rows: [
      '##################################....##',
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
      '========================================',
      '========================================',
      '----------------------------------------',
      '========================================',
      '#......................................#',
      '#.##############......###############..#',
      '#.#wwww####wwww#......##www####www###..#',
      '#.#####++#######......######++#######..#',
      '#......................................#',
      '#################....###################',
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
        // Where you wake up is on the lights already, and it is the only place
        // that is. You get one district free so you can learn what the panel
        // says before you are standing in front of one in the dark.
        litFree: true,
        lightCost: 0,
        props: [
          { id: 'ch_doors', tx: 19, ty: 12, spr: 'sign',
            label: '[E] Department 13 — IN SESSION',
            text: 'The docket behind the glass lists one matter. It has listed one matter for a very long time. The caption is your name, and under COUNSEL FOR, also your name.',
            fact: 'unsent_docket' },
          { id: 'ch_kiosk', tx: 20, ty: 17, spr: 'board', label: '[E] what is left of the newsstand',
            text: 'The papers are still stacked. Every one of them is the same edition. You check four before you stop checking.' },
          { id: 'ch_panel', tx: 26, ty: 12, spr: 'board', repeat: true, lights: true,
            label: '[E] the lighting panel',
            text: 'A grey breaker panel set into the wall beside the steps, with a form taped over the switches at eye height — not a notice, a FORM, with a line for hours and a line for a matter number.' },
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
    ox: 76, oy: 30,
    rows: [
      '################....################',
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
          { id: 'st_endday', tx: 20, ty: 18, spr: 'sign', repeat: true, office: true,
            label: '[E] go up to Suite 2B',
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
        greetDark: 'THE STRAND. The storefronts are all still there. You cannot see into a single one of them, and they can presumably see out.',
        lightCost: 10,
        props: [
          { id: 'st_panel', tx: 3, ty: 19, spr: 'board', repeat: true, lights: true,
            label: '[E] the lighting panel',
            text: 'The same panel. The same form, in the same hand, taped at the same height — which means somebody walked the whole length of this street putting them up, and that somebody expected people to be working here.' },
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
  {
    id: 'flats',
    name: 'RIVERSIDE / THE FLATS',
    ox: 0, oy: 30,
    rows: [
      '~~~#################################',
      '~~~,...............................#',
      '~~~,...............................#',
      '~~~,..#############....###########.#',
      '~~~,..#############....###########.#',
      '~~~,..#############....###########.#',
      '~~~,..#############....###########.#',
      '~~~,..#############....###########.#',
      '~~~,..#############....#www##www##.#',
      '~~~,..##wwww##www##....####++#####.#',
      '~~~,..#####++######................#',
      '~~~,...............................#',
      '~~~,....T.......T.........T........#',
      '~~~,......bb............bb.........#',
      '~~~,...............................#',
      '~~~,.,,,,,,,,,,,...................#',
      '~~~,.,,T,,,,,,,,...................#',
      '~~~,.,,,,,,,,,,,...................#',
      '~~~,.,,,,,,,,T,,...................#',
      '~~~,.,,,,,,,,,,,...................#',
      '~~~,================================',
      '~~~,================================',
      '~~~,--------------------------------',
      '~~~,================================',
      '~~~,...............................#',
      '~~~,.###########....##############.#',
      '~~~,.#wwww##ww##....##wwww###wwww#.#',
      '~~~,.####++#####....#####++#######.#',
      '~~~,...............................#',
      '~~~#################################',
    ],
    layers: {
      street: {
        greet: 'RIVERSIDE. Everybody calls it The Flats and nobody calls it Riverside, including the river.',
        props: [
          { id: 'fl_centre', tx: 12, ty: 11, spr: 'sign', label: '[E] the community centre — notices',
            text: 'A glass case by the doors, and behind the glass, thirty photocopies of the same three-day notice with thirty different apartment numbers written in by hand. Served Saturday. There is no proof of service on any of them and a three-day notice served on a Saturday is not a three-day notice.',
            fact: 'flats_notices' },
          { id: 'fl_sale', tx: 27, ty: 10, spr: 'board', label: '[E] the sign on the fence',
            text: 'A realtor\'s board, zip-tied over an older one that has not been taken down: 34 UNITS · DELIVERED VACANT · IN ESCROW. Somebody has put a fist through DELIVERED and it has been repaired with packing tape, from the inside.',
            fact: 'flats_sale' },
          { id: 'fl_river', tx: 4, ty: 17, spr: 'sign', repeat: true, label: '[E] the bank',
            text: 'The river, moving at about the speed of a document. This is the only part of the city where you can stand and not be able to see the Tower District, and everybody down here knows exactly where to stand.' },
        ],
        pickups: [
          { id: 'fl_ordinance', tx: 8, ty: 16, spr: 'dossier', item: 'ordinance',
            name: 'CITY ORD. 41-7 — RELOCATION ASSISTANCE',
            note: 'Photocopied so many times the seal is a grey smudge. Any tenant displaced by a sale is owed relocation. Nobody in that glass case has been told.',
            fact: 'flats_relocation' },
        ],
        npcs: [
          { id: 'iris', name: 'Iris Nakamura', spr: 'iris', tx: 14, ty: 12,
            label: '[E] the woman with the clipboard' },
          { id: 'halloran', name: 'W. Halloran', spr: 'halloran', tx: 28, ty: 24,
            label: '[E] the man in the good coat' },
        ],
        actors: [
          { id: 'fl_civ1', type: 'civ', tx: 20, ty: 12 },
          { id: 'fl_civ2', type: 'civ', tx: 9, ty: 24 },
          { id: 'fl_srv1', type: 'server', tx: 30, ty: 18 },
        ],
      },
      floor: {
        sub: { T: 'x' },
        // DESIGN §7: the only place on THE FLOOR with daylight. It is also the
        // only district that costs nothing to light, and those are the same
        // fact — the building never owned this one, so it has nothing to bill.
        litFree: true,
        lightCost: 0,
        daylight: true,
        greet: 'THE FLATS. There is daylight here. You have not seen the sun and there is no sun, and the light is on the buildings all the same, and it is warm.',
        props: [
          { id: 'fl_centre', tx: 12, ty: 11, spr: 'sign', label: '[E] the community centre — the doors are open',
            text: 'The glass case is empty and clean. Inside, the big room, and in the big room thirty chairs set out in a circle with the gap left at the near side the way you leave it for whoever is still coming. The room is warm. Nothing in this building is warm.',
            fact: 'flats_chairs' },
          { id: 'fl_river', tx: 4, ty: 17, spr: 'sign', repeat: true, label: '[E] the bank',
            text: 'The river is moving. You watch it for a while to be sure, because nothing else in this city has moved since you woke up, and it keeps moving the entire time you watch it.',
            fact: 'flats_sun' },
          { id: 'fl_sale', tx: 27, ty: 10, spr: 'board', label: '[E] the board on the fence',
            text: 'The realtor\'s board is gone. Underneath it, the older one it was zip-tied over, which nobody ever took down and which reads: TENANTS COUNCIL MEETS THURSDAYS 7PM ALL WELCOME · SE HABLA ESPAÑOL · CHILDCARE.' },
        ],
        pickups: [
          { id: 'fl_sheet', tx: 14, ty: 11, spr: 'dossier', item: 'sheet',
            name: 'A SIGN-IN SHEET',
            note: 'Thirty-one lines, thirty-one hands, thirty-one names. Not one of them has been struck out. There are four blank lines at the bottom and the pen is still clipped to the board.',
            fact: 'flats_sheet' },
        ],
        npcs: [
          { id: 'iris', name: 'Iris Nakamura', spr: 'iris', tx: 13, ty: 13,
            label: '[E] the woman setting out chairs' },
        ],
        // no Unbilled here. Nothing on this district is billing.
        actors: [],
      },
    },
  },
  {
    id: 'motor',
    name: 'MOTOR ROW',
    ox: 36, oy: 60,
    rows: [
      '#################....###################',
      '#################....###################',
      '#################....###################',
      '#......................................#',
      '#.ooooooooooooo........###############.#',
      '#.o:::::::::::o........###############.#',
      '#.o:::::::::::o........###############.#',
      '#.o:::::::::::o........###############.#',
      '#.o::::::::::::........###############.#',
      '#.o::::::::::::........##wwww###wwww##.#',
      '#.o:::::::::::o........######++#######.#',
      '#.o:::::::::::o........................#',
      '#.ooooooooooooo........................#',
      '#.....T.....T.............T.....T......#',
      '#======================================#',
      '#======================================#',
      '#--------------------------------------#',
      '#======================================#',
      '#.......bb..................bb.........#',
      '#......................................#',
      '#.################....################.#',
      '#.##wwww###wwww###....##wwww###wwww###.#',
      '#.################....################.#',
      '#.################....################.#',
      '#.################....################.#',
      '#.################....################.#',
      '#.####++####++####....####++####++####.#',
      '#......................................#',
      '#..................xx..................#',
      '########################################',
    ],
    layers: {
      street: {
        greet: 'MOTOR ROW. Tow yards, body shops, and the only chiropractor in this city who returns a lawyer\'s call inside the hour.',
        props: [
          { id: 'mr_gate', tx: 15, ty: 8, spr: 'sign', label: '[E] BONILLA TOWING — gate',
            text: 'BONILLA TOWING & RECOVERY. STORAGE $65/DAY. LIEN SALE AFTER 30. The lien-sale line is the only one on the board that has been repainted, and it has been repainted recently.' },
          { id: 'mr_impound', tx: 8, ty: 8, spr: 'sign', label: '[E] the impound rows',
            text: 'Four rows of cars that stopped being transport and became collateral. Every one of them has a windshield ticket and a story, and in about a third of them the story is that somebody could not find eleven hundred dollars in a week. You know that number.' },
          { id: 'mr_chiro', tx: 29, ty: 11, spr: 'sign', label: '[E] KESTENBAUM CHIROPRACTIC — WALK-INS',
            text: 'KESTENBAUM CHIROPRACTIC — WALK-INS — ABOGADOS WELCOME. That last word is not on the sign. It is on a smaller sign, under the sign.' },
          { id: 'mr_shop', tx: 6, ty: 27, spr: 'board', label: '[E] the body shop, roll-up door open',
            text: 'A tow-truck cab up on the lift with its whole left side folded in — struck square, driver\'s door to the B-pillar, the paint transfer still on it in somebody else\'s colour. Nothing about this is a rear-end. Whoever hit this came across the intersection, and came across it fast.',
            fact: 'dee_liability' },
          { id: 'mr_bench', tx: 28, ty: 19, spr: 'board', label: '[E] the bus bench',
            text: 'A bus bench with a face on it, six feet wide and smiling: HURT? CALL VONNIE. NO FEE UNLESS WE WIN. The face has been up long enough to have faded, and somebody has drawn nothing on it at all, which in this neighbourhood is a form of respect.',
            fact: 'dee_rival' },
        ],
        pickups: [
          { id: 'mr_ledger', tx: 19, ty: 24, spr: 'dossier', item: 'ledger',
            name: 'A TREATMENT LEDGER, IN THE ALLEY TRASH',
            note: 'Forty-one patients, all of them somebody\'s plaintiff. The per-visit figure at the bottom is three times what an insurer pays for the same forty minutes.',
            fact: 'kest_lien' },
        ],
        npcs: [
          { id: 'dee', name: 'Dee Ferraro', spr: 'dee', tx: 16, ty: 11,
            label: '[E] the driver outside the yard' },
          { id: 'kestenbaum', name: 'Dr. Kestenbaum', spr: 'kestenbaum', tx: 33, ty: 11,
            label: '[E] the chiropractor' },
        ],
        actors: [
          { id: 'mr_civ1', type: 'civ', tx: 24, ty: 19 },
          { id: 'mr_civ2', type: 'civ', tx: 10, ty: 19 },
          { id: 'mr_srv1', type: 'server', tx: 33, ty: 27 },
        ],
      },
      floor: {
        sub: { T: 'x' },
        lightCost: 14,
        greet: 'MOTOR ROW. Every bay is lit and every lift is down and every car on this street is running.',
        greetDark: 'MOTOR ROW. You cannot see the cars. You can hear all of them.',
        props: [
          { id: 'mr_panel', tx: 18, ty: 3, spr: 'board', repeat: true, lights: true,
            label: '[E] the lighting panel',
            text: 'Bolted to the wall at the mouth of the alley, outdoors, in the weather — which it has not had for some time, there being no weather. Same form. Same hand.' },
          { id: 'mr_cars', tx: 8, ty: 8, spr: 'sign', label: '[E] the impound rows',
            text: 'Four rows, and every engine in all four is running. Warm hoods. Wipers parked. One of them has its indicator going, patiently, for a turn out of a lot it has been in for forty years. You put your hand on a tank and it is full, and you take your hand off, and it is still full.',
            fact: 'mr_running' },
          { id: 'mr_ticket', tx: 16, ty: 11, spr: 'board', label: '[E] a windshield ticket',
            text: 'IMPOUNDED — RELEASE ON SIGNATURE ONLY. You check the next one, and the next, and the next row. Same date on all of them. It is the date on every calendar in this building, which is today, which is the day it has been the entire time you have been awake.',
            fact: 'mr_tickets' },
          { id: 'mr_mine', tx: 12, ty: 6, spr: 'sign', label: '[E] the car in the second row',
            text: 'This one is not running. It is the only one. The ticket under the wiper has a name written on it in a hand you have been signing things with your entire adult life, and the date on it is not today. The date on it is tomorrow.',
            fact: 'mr_yours' },
        ],
        pickups: [
          { id: 'mr_keys', tx: 19, ty: 24, spr: 'dossier', item: 'keys',
            name: 'A RING OF KEYS, TAGGED', note: 'Forty-odd keys on a ring, each with a paper tag, each tag a matter number. None of them is a car key.',
            fact: 'mr_keyring' },
        ],
        npcs: [
          { id: 'yardman', name: 'The Yard Man', spr: 'yardman', tx: 15, ty: 9,
            label: '[E] the man at the gate' },
        ],
        actors: [
          { id: 'mr_unb1', type: 'unbilled', tx: 26, ty: 19 },
          { id: 'mr_unb2', type: 'unbilled', tx: 10, ty: 27 },
        ],
      },
    },
  },
];

// Where each path starts. Both are on the same street, forty tiles apart.
export const SPAWN = {
  street: { x: 82 * 40 + 20, y: 49 * 40 + 20 },   // The Strand, outside your own door
  floor: { x: 56 * 40 + 20, y: 48 * 40 + 20 },   // Courthouse Square, under Dept. 13
};
