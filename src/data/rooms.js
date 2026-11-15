// Room order, file names in assets/maps to load up (first one starts the run)
export const ROOMS = ['tutorial', 'deep', 'hollow'];

// Story cards, one line per screen. An exit with story: <key> shows them once
export const STORY = {
  intro: [
    'What goes out comes back.',
    'Ping was the loudest bat in the colony.',
    'At dusk, as the others left,\nhe gave his biggest shout yet.',
    'It bounced back.',
    "Wing's wrecked.\nThe colony's up there somewhere.",
    'STAGE 1\nThe deep',
  ],
  hollow: [
    'Something down here is listening.',
    'STAGE 2\nThe hollow',
  ],
  end: [
    'Cold air. Coming from above.',
    'The colony is up there somewhere.',
    'He shouted.\nSomething answered.',
    'To be continued.',
    'CALLBACK is a work in progress.\nThanks for playing.',
    'deaths: {deaths}',
  ],
};