import { describe, expect, it } from "vitest";
import { checkForSpam, MIN_HUMAN_FILL_TIME_MS, MAX_SUBMISSIONS_PER_IP_PER_HOUR } from "../spam";

describe("checkForSpam", () => {
  it("flags a filled honeypot", () => {
    const result = checkForSpam({ honeypotValue: "http://spam.example" });
    expect(result.isSpam).toBe(true);
    expect(result.reason).toBe("honeypot_filled");
  });

  it("flags a submission that's too fast to be human", () => {
    const result = checkForSpam({ msSinceRendered: MIN_HUMAN_FILL_TIME_MS - 1 });
    expect(result.isSpam).toBe(true);
    expect(result.reason).toBe("submitted_too_fast");
  });

  it("flags high submission velocity from one IP", () => {
    const result = checkForSpam({ recentSubmissionsFromIp: MAX_SUBMISSIONS_PER_IP_PER_HOUR + 1 });
    expect(result.isSpam).toBe(true);
    expect(result.reason).toBe("high_submission_velocity");
  });

  it("does not flag a normal, slow, low-velocity submission", () => {
    const result = checkForSpam({ msSinceRendered: MIN_HUMAN_FILL_TIME_MS + 5000, recentSubmissionsFromIp: 1 });
    expect(result.isSpam).toBe(false);
    expect(result.reason).toBeNull();
  });

  it("does not penalize a missing msSinceRendered (e.g. client didn't report it)", () => {
    expect(checkForSpam({}).isSpam).toBe(false);
  });
});
