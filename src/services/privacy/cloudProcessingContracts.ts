export type CloudProcessingCapability = {
  provider: 'disabled' | 'openai_decisions' | 'openai_responses';
  enabled: boolean;
  accepts: 'reviewed_pseudonymised_text';
  maxCharacters: number;
};

export type CloudUnderstandingResult = {
  provider: 'openai_decisions' | 'openai_responses';
  model: string;
  decision: 'low' | 'review' | 'high' | 'unknown';
  rationale?: string;
  explanation?: string;
  confidence?: number | null;
  review: { revision: string; sha256: string; purpose: string };
  advisory: true;
};

export type ReviewedTextRequest = { text: string; revision: string; sha256: string; purpose: string; reviewed: true };

/** The wire body is deliberately limited to the approved transformed text and its binding metadata. */
export function createReviewedTextRequest(input: { text: string; revision: string; sha256: string; purpose: string }): ReviewedTextRequest {
  return { text: input.text, revision: input.revision, sha256: input.sha256, purpose: input.purpose, reviewed: true };
}

export function parseCloudProcessingCapability(value: unknown): CloudProcessingCapability {
  if (!value || typeof value !== 'object') throw new Error('The LuLu service returned an invalid privacy capability response.');
  const body = value as Record<string, unknown>;
  const validProvider = body.provider === 'disabled' || body.provider === 'openai_decisions' || body.provider === 'openai_responses';
  const validLimit = Number.isSafeInteger(body.maxCharacters) && (body.maxCharacters as number) > 0 && (body.maxCharacters as number) <= 10000;
  if (!validProvider || typeof body.enabled !== 'boolean' || body.accepts !== 'reviewed_pseudonymised_text' || !validLimit || (body.provider === 'disabled' && body.enabled)) {
    throw new Error('The LuLu service returned an invalid privacy capability response.');
  }
  return body as CloudProcessingCapability;
}

export function parseCloudUnderstandingResult(value: unknown, expected: { revision: string; sha256: string; purpose: string }): CloudUnderstandingResult {
  if (!value || typeof value !== 'object') throw new Error('The cloud service returned an invalid interpretation response.');
  const body = value as Record<string, unknown>;
  const review = body.review && typeof body.review === 'object' ? body.review as Record<string, unknown> : null;
  const decision = ['low', 'review', 'high', 'unknown'].includes(String(body.decision));
  const explanationValid = body.provider === 'openai_decisions'
    ? typeof body.explanation === 'string' && body.explanation.length > 0 && body.explanation.length <= 2000
    : body.provider === 'openai_responses' && typeof body.rationale === 'string' && body.rationale.length <= 4000;
  const validConfidenceNumber = typeof body.confidence === 'number' && Number.isFinite(body.confidence) && body.confidence >= 0 && body.confidence <= 1;
  const confidenceValid = body.provider === 'openai_decisions'
    ? body.confidence === null || validConfidenceNumber
    : body.confidence === undefined || body.confidence === null || validConfidenceNumber;
  if ((body.provider !== 'openai_responses' && body.provider !== 'openai_decisions') || typeof body.model !== 'string' || !body.model.trim() || body.model.length > 200 ||
      !decision || !explanationValid || !confidenceValid || body.advisory !== true ||
      !review || review.revision !== expected.revision || review.sha256 !== expected.sha256 || review.purpose !== expected.purpose) {
    throw new Error('The cloud response did not match the reviewed text and request. No result was shown.');
  }
  return body as CloudUnderstandingResult;
}
