import { refreshAllDueCredits } from "../lib/planCredits.js";

export async function runMonthlyCreditReset() {
  const refreshedUsers = await refreshAllDueCredits();
  console.log(`Monthly credits refreshed for ${refreshedUsers} users`);
  return refreshedUsers;
}
