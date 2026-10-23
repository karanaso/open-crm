export const enumLabelKeys = {
  role: {
    admin: "enums.role.admin",
    member: "enums.role.member",
  },
  userStatus: {
    active: "enums.userStatus.active",
    inactive: "enums.userStatus.inactive",
  },
  ticketStatus: {
    open: "enums.ticketStatus.open",
    in_progress: "enums.ticketStatus.in_progress",
    pending: "enums.ticketStatus.pending",
    resolved: "enums.ticketStatus.resolved",
    closed: "enums.ticketStatus.closed",
  },
  ticketPriority: {
    urgent: "enums.ticketPriority.urgent",
    high: "enums.ticketPriority.high",
    normal: "enums.ticketPriority.normal",
    low: "enums.ticketPriority.low",
  },
  dealStatus: {
    open: "enums.dealStatus.open",
    won: "enums.dealStatus.won",
    lost: "enums.dealStatus.lost",
  },
  stageOutcome: {
    open: "enums.stageOutcome.open",
    won: "enums.stageOutcome.won",
    lost: "enums.stageOutcome.lost",
  },
  taskPriority: {
    low: "enums.taskPriority.low",
    normal: "enums.taskPriority.normal",
    high: "enums.taskPriority.high",
  },
  taskStatus: {
    open: "enums.taskStatus.open",
    completed: "enums.taskStatus.completed",
  },
  activityType: {
    note: "enums.activityType.note",
    call: "enums.activityType.call",
    email: "enums.activityType.email",
    meeting: "enums.activityType.meeting",
    stage_change: "enums.activityType.stage_change",
  },
  campaignChannel: {
    email: "enums.campaignChannel.email",
    phone: "enums.campaignChannel.phone",
    event: "enums.campaignChannel.event",
    social: "enums.campaignChannel.social",
    other: "enums.campaignChannel.other",
  },
  campaignStatus: {
    draft: "enums.campaignStatus.draft",
    active: "enums.campaignStatus.active",
    completed: "enums.campaignStatus.completed",
    archived: "enums.campaignStatus.archived",
  },
  recipientStatus: {
    targeted: "enums.recipientStatus.targeted",
    sent: "enums.recipientStatus.sent",
    opened: "enums.recipientStatus.opened",
    clicked: "enums.recipientStatus.clicked",
    responded: "enums.recipientStatus.responded",
    converted: "enums.recipientStatus.converted",
  },
  commentVisibility: {
    reply: "enums.commentVisibility.reply",
    internal: "enums.commentVisibility.internal",
  },
} as const;

export type EnumGroup = keyof typeof enumLabelKeys;

export function enumLabelKey<G extends EnumGroup>(
  group: G,
  value: keyof (typeof enumLabelKeys)[G],
) {
  return enumLabelKeys[group][value];
}
