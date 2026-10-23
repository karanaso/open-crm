export type DealMetricRow = {
  amount: string | number;
  probability: number;
  outcome: string;
};

export function dealMetrics(rows: DealMetricRow[]) {
  const open = rows.filter((row) => row.outcome === "open");
  const totalValue = open.reduce((sum, row) => sum + Number(row.amount), 0);
  const weightedValue = open.reduce(
    (sum, row) => sum + (Number(row.amount) * row.probability) / 100,
    0,
  );
  return { count: open.length, totalValue, weightedValue };
}

export type CampaignMetricRecipient = { recipient: { status: string } };

export function campaignMetrics(recipients: CampaignMetricRecipient[]) {
  const counts = {
    targeted: 0,
    sent: 0,
    opened: 0,
    clicked: 0,
    responded: 0,
    converted: 0,
  };
  for (const row of recipients) {
    const status = row.recipient.status as keyof typeof counts;
    if (status in counts) counts[status] += 1;
  }
  const audience = recipients.length;
  const responses = counts.responded + counts.converted;
  return {
    audience,
    counts,
    responseRate: audience > 0 ? (responses / audience) * 100 : 0,
    conversionRate: audience > 0 ? (counts.converted / audience) * 100 : 0,
  };
}
