interface Balance {
  memberId: string;
  memberName: string;
  amount: number; // positive = receive, negative = pay
}

interface Transfer {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
}

/**
 * Netting algorithm: minimize the number of transfers.
 *
 * Sort balances, then match the largest creditor with the largest debtor,
 * settling by the smaller absolute amount. Repeat until all settled.
 */
export function calculateSettlementTransfers(balances: Balance[]): Transfer[] {
  // Work with copies
  const debtors: Balance[] = []; // negative amounts (need to pay)
  const creditors: Balance[] = []; // positive amounts (will receive)

  for (const b of balances) {
    if (b.amount < 0) {
      debtors.push({ ...b, amount: Math.abs(b.amount) });
    } else if (b.amount > 0) {
      creditors.push({ ...b });
    }
  }

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    // Round to integer (yen)
    const roundedAmount = Math.round(settleAmount);

    if (roundedAmount > 0) {
      transfers.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.memberName,
        toMemberId: creditor.memberId,
        toName: creditor.memberName,
        amount: roundedAmount,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 1) di++;
    if (creditor.amount < 1) ci++;
  }

  return transfers;
}

/**
 * Calculate settlement amounts from points and chips.
 */
export function calculateSettlementAmounts(
  memberResults: {
    memberId: string;
    memberName: string;
    totalPoint: number;
    totalChips: number;
  }[],
  rateValue: number,
  chipValue: number,
  chipEnabled: boolean
): Balance[] {
  return memberResults.map((r) => {
    let amount = Math.round(r.totalPoint * rateValue);
    if (chipEnabled) {
      amount += r.totalChips * chipValue;
    }
    return {
      memberId: r.memberId,
      memberName: r.memberName,
      amount,
    };
  });
}
