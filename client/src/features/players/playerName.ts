export const unknownPlayerName = "שחקן לא ידוע";

export function playerDisplayName(playerId: string, ...sources: readonly (readonly { id: string; name: string }[])[]): string {
  for (const source of sources) {
    for (const player of source) {
      if (player.id === playerId && player.name.trim().length > 0) {
        return player.name;
      }
    }
  }

  return unknownPlayerName;
}
