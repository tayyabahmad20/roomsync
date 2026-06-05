/**
 * Computes per-user net balance for a room.
 *
 * Convention:
 * - positive balance => others owe this user (creditor)
 * - negative balance => this user owes others (debtor)
 */
export function computeNetBalances({ roomMembers, expenses }) {
  const members = roomMembers.map((m) => ({
    id: String(m._id ?? m.id ?? m),
    name: m.name,
    email: m.email,
  }));

  const balanceByUserId = new Map(members.map((m) => [m.id, 0]));

  for (const exp of expenses) {
    const amount = Number(exp.amount);
    if (!amount || amount <= 0) continue;

    const payerId = String(exp.paidBy);
    const splitIds = (exp.splitAmong || []).map((x) => String(x));

    // Equal split among splitAmong. If missing, skip.
    if (splitIds.length === 0) continue;

    const share = amount / splitIds.length;

    // Payer gets credit for total amount.
    balanceByUserId.set(payerId, (balanceByUserId.get(payerId) || 0) + amount);

    // Everyone in splitAmong pays their share.
    for (const uid of splitIds) {
      balanceByUserId.set(uid, (balanceByUserId.get(uid) || 0) - share);
    }
  }

  return members.map((m) => ({
    userId: m.id,
    name: m.name,
    email: m.email,
    balance: round2(balanceByUserId.get(m.id) || 0),
  }));
}

/**
 * Turns net balances into a minimal-ish set of transfers.
 * Output format: { fromUserId, toUserId, amount }
 */
export function computeSettlementTransfers(balances) {
  const creditors = [];
  const debtors = [];

  for (const b of balances) {
    if (b.balance > 0.01) creditors.push({ ...b });
    else if (b.balance < -0.01) debtors.push({ ...b });
  }

  // Sort to make results stable/predictable
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance); // most negative first

  const transfers = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const owe = Math.min(Math.abs(debtor.balance), creditor.balance);

    if (owe > 0.01) {
      transfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: round2(owe),
      });

      debtor.balance = round2(debtor.balance + owe); // closer to 0
      creditor.balance = round2(creditor.balance - owe);
    }

    if (Math.abs(debtor.balance) <= 0.01) i += 1;
    if (creditor.balance <= 0.01) j += 1;
  }

  return transfers;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
