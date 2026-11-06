import type { DialoguePage } from '../types';

export interface DialogueDef {
  pages: DialoguePage[];
}

export const DIALOGUE: Record<string, DialogueDef> = {
  mom: {
    pages: [
      { speaker: 'Mom', text: 'Right. All kids leave home someday. It said so on TV.' },
      { speaker: 'Mom', text: 'Professor Oak next door is looking for you.' },
    ],
  },
  intro_mom: {
    pages: [
      { speaker: 'Mom', text: 'Good morning! Your adventure starts today.' },
      { speaker: 'Mom', text: 'Be polite to Professor Oak, and please do not run into tall grass alone.' },
    ],
  },
  townie_1: { pages: [{ speaker: 'Townie', text: 'Technology is incredible! You can save your whole adventure into localStorage now.' }] },
  townie_2: { pages: [{ speaker: 'Townie', text: 'Professor Oak studies creatures in the big lab at the south end of town.' }] },
  route_tips: { pages: [{ speaker: 'Guide', text: 'Tall grass hides wild creatures. A healthy partner makes Route 1 much less scary.' }] },
  oak_intercept: {
    pages: [
      { speaker: 'Oak', text: 'Hey! Wait! Do not go out!' },
      { speaker: 'Oak', text: 'It is unsafe. Wild creatures live in tall grass. Come with me to my lab.' },
    ],
  },
  oak_lab: {
    pages: [
      { speaker: 'Oak', text: 'There are three creatures here. They are inside these capsules.' },
      { speaker: 'Oak', text: 'When I was young, I was a serious trainer. Now, choose one as your partner.' },
    ],
  },
  rival_lab: {
    pages: [{ speaker: 'Rival', text: 'I am waiting, Red. Pick whichever one makes losing hurt less.' }],
  },
  starter_bulb_eq: { pages: [{ speaker: 'Oak', text: 'So! You want the grass creature Sproutle?' }] },
  starter_char_eq: { pages: [{ speaker: 'Oak', text: 'So! You want the fire creature Kindlett?' }] },
  starter_squirt_eq: { pages: [{ speaker: 'Oak', text: 'So! You want the water creature Shelldrop?' }] },
  post_starter: {
    pages: [
      { speaker: 'Rival', text: 'I will take this one, then.' },
      { speaker: 'Rival', text: 'Wait, Red! Let us check out our creatures. Come on, I will take you on!' },
    ],
  },
  lab_post_battle: {
    pages: [
      { speaker: 'Oak', text: 'Excellent! You both have the beginnings of a real bond.' },
      { speaker: 'Oak', text: 'Route 1 is open now. Viridian City lies to the north.' },
    ],
  },
  viridian_to_be_continued: {
    pages: [
      { speaker: 'Viridian City', text: 'You made it to Viridian City.' },
      { speaker: 'Prototype', text: 'To be continued.' },
    ],
  },
  no_starter_ball: { pages: [{ speaker: 'Oak', text: 'Those capsules are empty now. Your partner and your rival have already been chosen.' }] },
  player_pc: {
    pages: [
      { speaker: 'PC', text: 'Red booted up the PC.' },
      { speaker: 'PC', text: 'There are old field notes, a map draft, and an empty storage box waiting for future creatures.' },
    ],
  },
  bedroom_bed: { pages: [{ speaker: 'Bed', text: 'The bed is neatly made. Mom must have known today was important.' }] },
  bedroom_desk: { pages: [{ speaker: 'Desk', text: 'A notebook is open to a page titled: Things to ask Professor Oak.' }] },
  bedroom_dresser: { pages: [{ speaker: 'Dresser', text: 'Adventure clothes, folded with suspicious care.' }] },
  bedroom_bookshelf: { pages: [{ speaker: 'Bookshelf', text: 'Creature encyclopedias, trainer magazines, and one guide with every page heavily marked.' }] },
  stairs_down: { pages: [{ text: 'The stairs lead downstairs.' }] },
  stairs_up: { pages: [{ text: 'The stairs lead back to your room.' }] },
  home_table: { pages: [{ speaker: 'Table', text: 'Breakfast dishes are already cleared. Mom moves fast.' }] },
  home_tv: { pages: [{ speaker: 'TV', text: 'A travel show is visiting a city with a famous creature gym.' }] },
  home_couch: { pages: [{ speaker: 'Couch', text: 'Comfortable, familiar, and suddenly much harder to leave behind.' }] },
  home_kitchen: { pages: [{ speaker: 'Kitchen', text: 'There is a note on the counter: Eat something before saving the world.' }] },
  home_plant: { pages: [{ speaker: 'Plant', text: 'It looks healthier than any plant you have personally remembered to water.' }] },
  home_picture: { pages: [{ speaker: 'Photo', text: 'A picture of you, Mom, and a much smaller backpack.' }] },
  home_front_door: { pages: [{ text: 'The front door opens toward Pallet Town.' }] },
  home_exterior_door: { pages: [{ text: 'Home. The porch still smells faintly like fresh laundry.' }] },
  player_house_sign: { pages: [{ speaker: 'Sign', text: "RED'S HOUSE" }] },
  rival_house_sign: { pages: [{ speaker: 'Sign', text: "BLUE'S HOUSE" }] },
  lab_sign: { pages: [{ speaker: 'Sign', text: 'OAK CREATURE RESEARCH LAB' }] },
  rival_exterior_door: { pages: [{ text: "Blue's front door is unlocked. Of course it is." }] },
  lab_exterior_door: { pages: [{ text: "Professor Oak's lab is open." }] },
  home_mailbox: { pages: [{ speaker: 'Mailbox', text: 'A postcard from Viridian City is tucked behind the letters.' }] },
  rival_mailbox: { pages: [{ speaker: 'Mailbox', text: "The nameplate reads BLUE. The mailbox is somehow smug." }] },
  town_sign: { pages: [{ speaker: 'Pallet Town', text: 'A quiet town where big journeys start before anyone feels ready.' }] },
  rival_house_table: { pages: [{ speaker: 'Table', text: 'A half-finished strategy chart compares the three starter creatures.' }] },
  rival_house_bookshelf: { pages: [{ speaker: 'Bookshelf', text: 'Battle manuals, league rulebooks, and a suspiciously pristine etiquette guide.' }] },
  rival_house_tv: { pages: [{ speaker: 'TV', text: 'A recorded league match is paused right before the winning move.' }] },
  rival_house_desk: { pages: [{ speaker: "Blue's Desk", text: 'A note says: Pick second, win anyway.' }] },
  rival_house_front_door: { pages: [{ text: 'The door leads back to town.' }] },
  rival_house_sibling: {
    pages: [
      { speaker: 'Daisy', text: 'Blue raced to the lab. He tried to look calm, which means he was absolutely not calm.' },
      { speaker: 'Daisy', text: 'Please keep him out of trouble. Or at least keep notes.' },
    ],
  },
  lab_bookshelf: { pages: [{ speaker: 'Bookshelf', text: 'Field journals catalog habitats, footprints, and several pages of coffee stains.' }] },
  lab_machine: { pages: [{ speaker: 'Machine', text: 'A scanner hums softly. It is measuring creature energy from the capsules.' }] },
  lab_terminal: { pages: [{ speaker: 'Terminal', text: 'The screen shows live habitat reports from Route 1.' }] },
  lab_specimens: { pages: [{ speaker: 'Specimens', text: 'Tiny preserved scales and leaves shimmer inside labeled jars.' }] },
  lab_whiteboard: { pages: [{ speaker: 'Whiteboard', text: 'Three arrows point from STARTER PARTNER to TRUST, TRAINING, and RESPONSIBILITY.' }] },
  oak_desk: { pages: [{ speaker: "Oak's Desk", text: 'Stacks of research papers compete with a cold cup of tea.' }] },
  starter_table: { pages: [{ speaker: 'Starter Table', text: 'Three capsules rest in fitted pedestals. Each one is warm with stored creature energy.' }] },
  lab_exit_door: { pages: [{ text: 'The lab door leads back to Pallet Town.' }] },
};

export type DialogueId = keyof typeof DIALOGUE;
