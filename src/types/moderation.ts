// AT Protocol moderation types

export type LabelPreference = "ignore" | "warn" | "hide";

export interface LabelerDefinition {
  did: string;
  url: string;
  isDefault: boolean;
  supportedLabels: Record<string, LabelPreference>;
  // The lookup map for UI strings
  labelDefs: Record<string, LabelValueDefinition>; 
}

export interface LabelValueDefinition {
  identifier: string;
  severity: 'inform' | 'alert' | 'none';
  blurs: 'content' | 'media' | 'none';
  adultOnly: boolean;
  defaultSetting?: LabelPreference;
  locales: Array<{
    lang: string;
    name: string;
    description: string;
  }>;
}

export interface ContentLabel {
  sourceDid: string; // Who said it?
  val: string; // What is the label?
  cts: string; // Timestamp
  preference: LabelPreference; // Resolved preference for this specific label
}

// Type for the labeler service record response
export interface LabelerServiceRecord {
  did: string;
  serviceEndpoint: string;
  policies: {
    labelValues: string[];
    labelValueDefinitions?: Array<{
      identifier: string;
      defaultSetting: LabelPreference;
    }>;
  };
}

// Type for queryLabels response (matches ATProto API)
export interface QueryLabelsResponse {
  cursor?: string;
  labels: Array<{
    ver?: number;
    src: string; // DID
    uri: string; // AT URI
    cid?: string; // CID
    val: string; // Label value
    neg?: boolean; // Negation label
    cts: string; // Created timestamp
    exp?: string; // Expiry timestamp
    sig?: Uint8Array; // Signature
  }>;
}
