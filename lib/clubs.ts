// The seventeen clubs of the Telstra Premiership.
//
// teamId and themeKey come from the NRL players feed (filterTeams). The ladder
// feed identifies clubs by themeKey only and carries no teamId, so this table is
// the join between the two.
//
// accent is the club colour that carries the screen. Several clubs are officially
// darker than the app base (#0B1015), so where a club's primary would disappear
// against the background the brighter of its own colours leads and the darker one
// follows as accentDeep. Nothing here is invented — both values are always the
// club's own.

export type Club = {
  teamId: number
  themeKey: string
  name: string
  accent: string
  accentDeep: string
}

export const CLUBS: Club[] = [
  { teamId: 500011, themeKey: 'broncos', name: 'Broncos', accent: '#FFC72C', accentDeep: '#6C1D45' },
  { teamId: 500010, themeKey: 'bulldogs', name: 'Bulldogs', accent: '#2B6DEF', accentDeep: '#00539F' },
  { teamId: 500012, themeKey: 'cowboys', name: 'Cowboys', accent: '#3C7BD4', accentDeep: '#002B5C' },
  { teamId: 500723, themeKey: 'dolphins', name: 'Dolphins', accent: '#E4002B', accentDeep: '#B4975A' },
  { teamId: 500022, themeKey: 'dragons', name: 'Dragons', accent: '#E2231A', accentDeep: '#009B48' },
  { teamId: 500031, themeKey: 'eels', name: 'Eels', accent: '#F5C518', accentDeep: '#006BB6' },
  { teamId: 500003, themeKey: 'knights', name: 'Knights', accent: '#00A9E0', accentDeep: '#003F71' },
  { teamId: 500014, themeKey: 'panthers', name: 'Panthers', accent: '#00A44E', accentDeep: '#1A1A1A' },
  { teamId: 500005, themeKey: 'rabbitohs', name: 'Rabbitohs', accent: '#DA291C', accentDeep: '#005741' },
  { teamId: 500013, themeKey: 'raiders', name: 'Raiders', accent: '#95C11F', accentDeep: '#00539F' },
  { teamId: 500001, themeKey: 'roosters', name: 'Roosters', accent: '#E8112D', accentDeep: '#0A2240' },
  { teamId: 500002, themeKey: 'sea-eagles', name: 'Sea Eagles', accent: '#87004D', accentDeep: '#6D0038' },
  { teamId: 500028, themeKey: 'sharks', name: 'Sharks', accent: '#00B2A9', accentDeep: '#0057B8' },
  { teamId: 500021, themeKey: 'storm', name: 'Storm', accent: '#8246AF', accentDeep: '#632390' },
  { teamId: 500004, themeKey: 'titans', name: 'Titans', accent: '#009AD8', accentDeep: '#C8A45C' },
  { teamId: 500032, themeKey: 'warriors', name: 'Warriors', accent: '#00A0DC', accentDeep: '#231F20' },
  { teamId: 500023, themeKey: 'wests-tigers', name: 'Wests Tigers', accent: '#F68B1F', accentDeep: '#000000' },
]

const BY_THEME = new Map(CLUBS.map((c) => [c.themeKey, c]))
const BY_ID = new Map(CLUBS.map((c) => [c.teamId, c]))

export const clubByThemeKey = (key: string) => BY_THEME.get(key)
export const clubById = (id: number) => BY_ID.get(id)

export const badgeUrl = (themeKey: string) => `https://www.nrl.com/.theme/${themeKey}/badge.svg`
