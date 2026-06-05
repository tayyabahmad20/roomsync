/**
 * Compute a simple net settlement for a room.
 *
 * Model:
 * - Each expense is split equally among splitAmong.
 * - payer gets credited amount, each participant gets debited their share.
 *
 * Output:
 * - balances: map userId -> net balance (positive means they should receive money)
 * - transfers: simplified list of { from, to, amount }
 */
export function computeSettlement({ members, expenses }) {
  const balances = {};
  const memberById = {};

  for (const m of members) {
    balances[m.id] = 0;
    memberById[m.id] = m;
  }

  for (const e of expenses) {
    const participants = e.splitAmong?.length ? e.splitAmong : [];
    if (!participants.length) continue;

    const share = e.amount / participants.length;

    // payer credited full amount
    if (balances[e.paidBy] === undefined) balances[e.paidBy] = 0;
    balances[e.paidBy] += e.amount;

    // each participant debited share
    for (const u of participants) {
      if (balances[u] === undefined) balances[u] = 0;
      balances[u] -= share;
    }
  }

  // Round to cents to reduce floating point noise
  for (const id of Object.keys(balances)) {
    balances[id] = round2(balances[id]);
  }

  // Build debtors/creditors lists
  const creditors = []; // {id, amount}
  const debtors = []; // {id, amountOwed}

  for (const [id, bal] of Object.entries(balances)) {
    if (bal > 0.01) creditors.push({ id, amount: bal });
    else if (bal < -0.01) debtors.push({ id, amount: -bal });
  }

  // Greedy matching to create transfers
  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];

    const amt = Math.min(d.amount, c.amount);
    transfers.push({
      from: { id: d.id, name: memberById[d.id]?.name },
      to: { id: c.id, name: memberById[c.id]?.name },
      amount: round2(amt)
    });

    d.amount = round2(d.amount - amt);
    c.amount = round2(c.amount - amt);

    if (d.amount <= 0.01) i++;
    if (c.amount <= 0.01) j++;
  }

  // Present balances also with names
  const balancesWithNames = Object.entries(balances).map(([id, balance]) => ({
    id,
    name: memberById[id]?.name,
    balance
  }));

  return {
    balances: balancesWithNames,
    transfers
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
