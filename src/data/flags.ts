export const FLAGS = {
  MET_MOM: 'met_mom',
  GOT_STARTER: 'got_starter',
  BEAT_RIVAL_1: 'beat_rival_1',
  OAK_INTERCEPTED: 'oak_intercepted',
  LAB_POST_BATTLE: 'lab_post_battle',
  ROUTE_1_CLEAR: 'route_1_clear',
  REACHED_VIRIDIAN: 'reached_viridian',
} as const;

export type FlagId = (typeof FLAGS)[keyof typeof FLAGS];
