function distributeRemainder(rem, n) {
  const q = Math.floor(rem / n);
  const r = rem - q * n;
  const arr = Array(n).fill(q);
  for (let i = 0; i < r; i++) arr[i] += 1;
  return arr;
}

function computeFinalSplit({ members, bill }) {
  const n = Math.max(1, members.length);
  const total = bill.total || 0;

  if ((bill.splitMode || "EVEN") === "EVEN") {
    const shares = distributeRemainder(total, n);
    return members.map((m, i) => ({
      memberId: m._id.toString(),
      name: m.name,
      amount: shares[i],
    }));
  }

  // ITEM: sum item per member + leftover split evenly
  const base = new Map(members.map((m) => [m._id.toString(), 0]));
  for (const it of bill.items || []) {
    const k = it.assigneeMemberId.toString();
    base.set(k, (base.get(k) || 0) + (it.cost || 0));
  }

  const baseArr = members.map((m) => base.get(m._id.toString()) || 0);
  const sumItems = baseArr.reduce((s, x) => s + x, 0);
  const leftover = total - sumItems;
  const shares = distributeRemainder(leftover, n);

  return members.map((m, i) => ({
    memberId: m._id.toString(),
    name: m.name,
    amount: (baseArr[i] || 0) + shares[i],
  }));
}

module.exports = { computeFinalSplit };
