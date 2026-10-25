export type SegmentCriteria = {
  tags?: string[];
  industry?: string;
  jobTitle?: string;
  ownerId?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type CampaignSegmentSnapshot = {
  name: string;
  criteria: SegmentCriteria;
};

export type MessageAudienceSnapshot = {
  kind: "group" | "segment";
  name: string;
  criteria?: SegmentCriteria;
};

export type ActivityMetadata = {
  fromStageId?: string;
  toStageId?: string;
  fromStageName?: string;
  toStageName?: string;
};

export type UserRole = "admin" | "member";
export type UserStatus = "active" | "inactive";
