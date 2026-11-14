import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPeptidesPreviewProviderOutcome,
  classifyPreviewDeliveryFailure,
  collectPreviewCandidatePages,
  choosePeptidesPreviewFollowupStage,
  isEligiblePreviewFollowupEmail,
} from "./peptidesPreviewFollowupRules";

const now = new Date("2026-09-25T12:00:00.000Z");
const tracking = (stage: "J1" | "J3" | "J7", sentAt: string, status = "success") => ({
  emailType: `peptidesPreviewFollowup${stage}`,
  sentAt,
  sendpulseStatus: status,
  sendpulseTaskId: status === "success" ? `task-${stage}` : null,
});

test("J1 becomes due after 24 hours, never before", () => {
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-24T12:01:00Z"), [], now), null);
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-24T11:59:00Z"), [], now), "J1");
});

test("J3 requires a successful J1 and a 36-hour safety gap", () => {
  const capturedAt = new Date("2026-09-21T00:00:00Z");
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [tracking("J1", "2026-09-24T12:00:00Z")], now), null);
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [tracking("J1", "2026-09-23T00:00:00Z")], now), "J3");
});

test("J7 requires a successful J3 and a 72-hour safety gap", () => {
  const capturedAt = new Date("2026-09-17T12:00:00Z");
  const j1 = tracking("J1", "2026-09-18T12:00:00Z");
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [j1, tracking("J3", "2026-09-23T12:01:00Z")], now), null);
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [j1, tracking("J3", "2026-09-22T11:59:00Z")], now), "J7");
});

test("successful stage tracking is idempotent and stops the sequence", () => {
  const capturedAt = new Date("2026-09-17T12:00:00Z");
  const history = [
    tracking("J1", "2026-09-18T12:00:00Z"),
    tracking("J3", "2026-09-20T12:00:00Z"),
    tracking("J7", "2026-09-24T12:00:00Z"),
  ];
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, history, now), null);
});

test("failed attempts do not count as a delivered stage", () => {
  const capturedAt = new Date("2026-09-21T00:00:00Z");
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [tracking("J1", "2026-09-25T11:00:00Z", "failed")], now), null);
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [tracking("J1", "2026-09-25T09:59:00Z", "failed")], now), "J1");
});

test("a provider task id never turns an explicit failure into a delivered stage", () => {
  const capturedAt = new Date("2026-09-21T00:00:00Z");
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [{
    emailType: "peptidesPreviewFollowupJ1",
    sentAt: "2026-09-25T09:00:00Z",
    sendpulseStatus: "failed",
    sendpulseTaskId: "provider-rejected-task",
  }], now), "J1");
});

test("pending reconciliation blocks only its recipient without consuming another send slot", () => {
  const capturedAt = new Date("2026-09-21T00:00:00Z");
  assert.equal(choosePeptidesPreviewFollowupStage(capturedAt, [tracking("J1", "2026-09-24T00:00:00Z", "pending")], now), null);
});

test("stale leads and unsafe addresses are excluded", () => {
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-08-01T00:00:00Z"), [], now), null);
  assert.equal(isEligiblePreviewFollowupEmail("client@gmail.com"), true);
  assert.equal(isEligiblePreviewFollowupEmail("johndoe@yahoo.fr"), false);
  assert.equal(isEligiblePreviewFollowupEmail("qa@test.com"), false);
  assert.equal(isEligiblePreviewFollowupEmail("coaching@achzodcoaching.com"), false);
  assert.equal(isEligiblePreviewFollowupEmail("achzodyt@gmail.com"), false);
});

test("provider ambiguity fails closed instead of retrying a possible send", () => {
  assert.equal(classifyPeptidesPreviewProviderOutcome({ result: true, httpStatus: 200 }), "success");
  assert.equal(classifyPeptidesPreviewProviderOutcome({ result: false, httpStatus: 422, error: "quota" }), "confirmed_failed");
  assert.equal(classifyPeptidesPreviewProviderOutcome({ result: false, error: "unsubscribed" }), "confirmed_failed");
  assert.equal(classifyPeptidesPreviewProviderOutcome({ result: false, error: "TypeError: fetch failed" }), "reconcile_required");
  assert.equal(classifyPeptidesPreviewProviderOutcome({ result: false, error: "database connection reset after provider call" }), "reconcile_required");
});

for (const error of [
  '{"eventType":"hard_fail","smtpAnswerCode":550,"smtpAnswerData":"Bad recipients"}',
  '{"smtp_answer_code":555,"smtpAnswerData":"Unsubscribed"}',
  'Bad recipients',
]) {
  test("permanent provider rejection suppresses recipient: " + error, () => {
    const failed = { ...tracking("J1", "2026-09-20T00:00:00Z", "failed"), sendpulseError: error };
    assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-19T00:00:00Z"), [failed], now), null);
  });
}

test("a result-email hard failure also suppresses later marketing", () => {
  const failed = { ...tracking("J1", "2026-09-20T00:00:00Z", "failed"), emailType: "peptidesPreviewResult", metadata: { sendpulseSmtpAnswerCode: 550 } };
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-19T00:00:00Z"), [failed], now), null);
});

test("temporary SMTP 450 waits then permits only a bounded retry", () => {
  const failed = { ...tracking("J1", "2026-09-25T09:00:00Z", "failed"), sendpulseError: '{"eventType":"soft_fail","smtpAnswerCode":450}' };
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-21T00:00:00Z"), [failed], now), "J1");
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-21T00:00:00Z"), [failed, { ...failed, sentAt: "2026-09-25T08:00:01Z" }], now), null);
});

test("three failed attempts stop permanently instead of looping every two hours", () => {
  const failed = [18, 19, 20].map((day) => tracking("J1", "2026-09-" + day + "T00:00:00Z", "failed"));
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-17T00:00:00Z"), failed, now), null);
});

test("claim and provider pairs count as one attempt each", () => {
  const rows = [20, 21].flatMap((day) => [
    { ...tracking("J1", "2026-09-" + day + "T00:00:00Z", "failed"), metadata: { previewFollowupClaim: true, providerTaskId: "task-" + day } },
    { ...tracking("J1", "2026-09-" + day + "T00:00:01Z", "failed"), sendpulseTaskId: "task-" + day },
  ]);
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-17T00:00:00Z"), rows, now), "J1");
});

test("pending reconciliation at any stage blocks the whole recipient", () => {
  const rows = [tracking("J1", "2026-09-20T00:00:00Z"), tracking("J7", "2026-09-20T00:00:00Z", "pending")];
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-17T00:00:00Z"), rows, now), null);
});

test("legacy malformed or null errors do not crash selection", () => {
  for (const value of ["null", "[]", "{", "plain failure"]) {
    const failed = { ...tracking("J1", "2026-09-20T00:00:00Z", "failed"), sendpulseError: value };
    assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-19T00:00:00Z"), [failed], now), "J1");
  }
});

test("mixed unlinked legacy provider and claims cannot evade three-attempt cap", () => {
  const rows = [
    { ...tracking("J1", "2026-09-20T00:00:00Z", "failed"), id: "legacy-provider-1" },
    { ...tracking("J1", "2026-09-21T00:00:00Z", "failed"), id: "legacy-provider-2" },
    { ...tracking("J1", "2026-09-22T00:00:00Z", "failed"), id: "claim-1", metadata: { previewFollowupClaim: true } },
  ];
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-17T00:00:00Z"), rows, now), null);
});

test("writer providerError round trip blocks a terminal rejection without provider sibling", () => {
  for (const providerError of [JSON.stringify({eventType:"hard_fail",smtpAnswerCode:550,smtpAnswerData:"Bad recipients"}), {eventType:"hard_fail",smtpAnswerCode:550,smtpAnswerData:"Bad recipients"}]) {
    const row = {...tracking("J1", "2026-09-20T00:00:00Z", "failed"), sendpulseError:"provider_send_failed", metadata:{previewFollowupClaim:true,providerError}};
    assert.equal(classifyPreviewDeliveryFailure(row), "recipient_suppressed");
    assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-17T00:00:00Z"),[row],now),null);
  }
});

test("provider policy/account holds are not labelled invalid recipients", () => {
  assert.equal(classifyPreviewDeliveryFailure({...tracking("J1","2026-09-20T00:00:00Z","auth_failed")}),"reconcile_required");
  assert.equal(classifyPreviewDeliveryFailure({...tracking("J1","2026-09-20T00:00:00Z","failed"),sendpulseError:'{"smtpAnswerCode":550,"smtpAnswerData":"5.7.1 policy rejection"}'}),"reconcile_required");
  assert.equal(classifyPreviewDeliveryFailure({...tracking("J1","2026-09-20T00:00:00Z","bounced"),sendpulseError:'{"smtpAnswerCode":450}'}),"retryable");
});

test("accepted transient task must be reconciled, never blindly resent", () => {
  const row={...tracking("J1","2026-09-20T00:00:00Z","failed"),sendpulseTaskId:"already-accepted",sendpulseError:'{"eventType":"soft_fail","smtpAnswerCode":450}'};
  assert.equal(classifyPreviewDeliveryFailure(row),"reconcile_required");
  assert.equal(choosePeptidesPreviewFollowupStage(new Date("2026-09-17T00:00:00Z"),[row],now),null);
});

test("pagination crosses 1000 blocked records to reach newer eligible leads", async () => {
  const rows=Array.from({length:1100},(_,i)=>i);const offsets:number[]=[];
  const found=await collectPreviewCandidatePages(async(offset,limit)=>{offsets.push(offset);return rows.slice(offset,offset+limit);},(x)=>x<1000?null:x);
  assert.deepEqual(offsets,[0,500,1000]);assert.equal(found.length,100);assert.equal(found[0],1000);
});

test("both metadata-only provider identities require reconciliation for 450",()=>{
 for(const key of ["providerTaskId","reconciledProviderTaskId"]){const row={...tracking("J1","2026-09-20T00:00:00Z","failed"),metadata:{[key]:"accepted-task",providerError:{smtpAnswerCode:450}},sendpulseError:"provider_send_failed"};assert.equal(classifyPreviewDeliveryFailure(row),"reconcile_required");}
});
test("typed bounce events retain safe holds without confusing soft bounce",()=>{
 const row={...tracking("J1","2026-09-20T00:00:00Z","failed"),deliveryEvents:["bounce"]};
 assert.equal(classifyPreviewDeliveryFailure(row),"reconcile_required");
 assert.equal(classifyPreviewDeliveryFailure({...row,sendpulseError:'{"eventType":"soft_bounce","smtpAnswerCode":450}'}),"retryable");
 assert.equal(classifyPreviewDeliveryFailure({...row,deliveryEvents:["unsubscribe"]}),"recipient_suppressed");
});
