export class ConsentRequiredError extends Error {
  readonly code = "FACE_SEARCH_CONSENT_REQUIRED";
  constructor() {
    super("A guest must accept the privacy notice before a face search can run.");
    this.name = "ConsentRequiredError";
  }
}

/** "Consent must be recorded" as a hard gate, not a UI-only nicety — thrown if a search is ever attempted without a prior `FaceConsentLog` entry for this guest/gallery. Called at the start of the search flow, before any image ever reaches the face-recognition provider. */
export function assertConsented(consentedAt: Date | null): void {
  if (!consentedAt) throw new ConsentRequiredError();
}
