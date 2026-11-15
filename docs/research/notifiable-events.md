# Events in Cadence that could trigger a Notification

Research for [#4](https://github.com/JennferLuo/cohort-005-project-jl/issues/4). Facts only: this lists what exists, and chooses nothing.

## Source and scope

- **Code read**: the working tree of the main checkout (branch `jluo-adr`, HEAD `979e285`, plus uncommitted files such as `app/lib/refunds.server.ts`, `app/routes/admin.refunds.tsx`, `app/lib/mailer.server.ts`, `app/lib/refund-emails.ts`). Every `file:line` below points at that tree. This branch was cut from `origin/main` (`5b48688`), which does not contain most of those files, so the line numbers will not resolve here.
- **Files read**: `app/routes/*`, `app/lib/*`, `app/db/schema.ts`, `GLOSSARY.md`, `docs/adr/`.
- **Vocabulary**: `GLOSSARY.md`. Code says `learner`, `coupon` and `admin`; the glossary terms are Student, Seat and Platform Admin.
- **Recipient lookup**: `users.role` is `student | instructor | admin` (`app/db/schema.ts:11-15`). A course's Instructor is `courses.instructorId` (`schema.ts:73`). A Team Admin is a `team_members` row with `role = admin` (`schema.ts:40-43, 266-278`). A Purchase's buyer is `purchases.userId` (`schema.ts:217`).
- **No event bus, queue, job runner or webhook exists.** Every event below is a synchronous DB write inside a route `action`, a `loader`, or a `lib` function called from one. Nothing runs on a schedule.

## What already sends or builds email

| Thing | Where | Fact |
| --- | --- | --- |
| `sendEmail` / `MailTransport` | `app/lib/mailer.server.ts:15-72` | Sends via Postmark when `POSTMARK_SERVER_TOKEN` is set. Otherwise it writes JSON files to `.outbox/`. Plain text only, one `to`. |
| Refund Request raised email | `app/lib/refunds.server.ts:394-407`, sent at `app/routes/courses.$slug.refund.ts:75` | **Sent today**, to the buyer only. |
| Refund Request approved/declined email | `app/lib/refunds.server.ts:736-781` (`buildDecisionEmail`), sent at `app/routes/admin.refunds.tsx:130` | **Sent today**, to the buyer only. Includes the Platform Admin's note. |
| `refund-emails.ts` | `app/lib/refund-emails.ts:13-73` | Builds request/approved/declined emails, and `logEmail` writes them to the console. **Nothing imports it** (grep across `app/` finds only its test). It duplicates the builders in `refunds.server.ts`. |
| `refund-decision.server.ts` | `app/lib/refund-decision.server.ts:122-146` | A second `approve`/`declineRefundRequest`. **Nothing imports it.** It writes a `declineReason` column that is not in `schema.ts` (the column there is `decisionNote`, `schema.ts:254`). |
| Welcome-email stub | `app/routes/courses.$slug.purchase.tsx:173-175` | `if (sendEmail) { // Would send welcome email here }`. Every caller passes `false` (`:371`). |

## Inventory

Column notes: **Data available** lists what is in scope at that line, or one obvious lookup away. **Recipient(s)** is "likely": who the event concerns according to `GLOSSARY.md`. Nobody has decided recipients.

### Refunds

| Event | Where (file:line) | Likely recipient(s) | Data available at that point |
| --- | --- | --- | --- |
| Refund Request raised (Individual Purchase or Team Licence) | `app/lib/refunds.server.ts:379-388` (insert `refunds`, status `open`); route `app/routes/courses.$slug.refund.ts:63-77` | Student / Team Admin (buyer): already emailed. Platform Admin: decides it (GLOSSARY), and is not notified today. | `refundRequestId`, `kind` (`individual` / `team_licence`), buyer `users` row (name, email), `course` row, `purchase` (amountPaid, createdAt, country), `reason`, `now` |
| Team Licence Seats go "on hold" (side effect of the above) | Derived, not written: `app/lib/refunds.server.ts:117-119` (`getSeatAvailability` returns `on_hold` while an Open Refund Request exists) | Team Admin; Students holding an unredeemed Seat code (they are not known to Cadence until they redeem) | purchaseId, the Seats (`coupons`) on that purchase |
| Refund Request approved | `app/lib/refunds.server.ts:669-678` (status `approved`, `amountRefunded`, `decisionNote`, `resolvedAt`, `resolvedByUserId`); route `app/routes/admin.refunds.tsx:109-130` | Student / Team Admin (buyer): already emailed. Other Platform Admins (first decision wins, `:587-595`). For an Individual Purchase, the course's Instructor (they lose a Student). | refundRequestId, purchase, amountPaid (= amount refunded), note, platformAdminId, `now`, Seats (`getSeats`), course and buyer via `buildDecisionEmail` |
| Enrollment ended by approval (Individual Purchase) | `app/lib/refunds.server.ts:657-666` (delete `enrollments`, skipped if the buyer also holds a Claimed Seat for the course) | Student; Instructor | purchase.userId, purchase.courseId |
| Unclaimed Seats voided by approval (Team Licence) | `app/lib/refunds.server.ts:638-643` (set `coupons.refundedAt`) | Team Admin | purchase.id, `now`, the Seats updated |
| Approval refused because a Seat was claimed | `app/lib/refunds.server.ts:628-636` (returns 409, nothing written) | Platform Admin (shown in the UI only) | purchase, Seats |
| Refund Request declined | `app/lib/refunds.server.ts:713-721` (status `declined`, `decisionNote` required); route `app/routes/admin.refunds.tsx:118-130` | Student / Team Admin (buyer): already emailed | refundRequestId, purchase, trimmed note, platformAdminId, `now` |
| Refund issued (Issued Refund) | **Does not exist in code.** GLOSSARY defines Pending/Issued Refund, but `refunds` has no money-movement state (`schema.ts:232-257`, status enum `open/approved/declined` at `:34-38`). There is no payment provider integration. Approval sets `amountRefunded` and nothing more. | (Student / Team Admin) | n/a |
| Refund failed (Failed Refund) | **Does not exist in code.** Same reason as above. | (Student / Team Admin; Platform Admin) | n/a |
| Refund window / Watch Limit crossed | **No write; derived on read.** Rules at `app/lib/refund-rules.ts:5-7` (14 days, 1 h Watched, 50% lessons). They are evaluated when a request is checked or listed (`refunds.server.ts:270`, `:322`). | (Student) | Would need a scheduled job, or a check on each watch event. None exists. |

### Enrollment and Purchases

| Event | Where (file:line) | Likely recipient(s) | Data available at that point |
| --- | --- | --- | --- |
| Individual Purchase made | `app/routes/courses.$slug.purchase.tsx:366-372` → `createPurchase` `:186-190` | Student (buyer); Instructor (sale); Platform Admin | currentUserId, `course` row (incl. instructorId, title, slug, price), `pppPrice` paid, `country` |
| Enrollment created by Individual Purchase (new Student on an Instructor's course) | `app/routes/courses.$slug.purchase.tsx:167-171` (`enrollUser`); the welcome stub is at `:173-175` | Student; Instructor (`course.instructorId`) | enrollment row (id, userId, courseId, enrolledAt), course |
| Team Licence bought | `app/routes/courses.$slug.purchase.tsx:375-379` → `createTeamPurchase` `:245-256` | Team Admin (buyer); Instructor; Platform Admin | currentUserId, course, quantity, totalPrice, country, `purchase`, `team`, generated `coupons` (Seat codes) |
| Team created / buyer becomes Team Admin (first Team Licence only) | `app/routes/courses.$slug.purchase.tsx:210-219` | Team Admin | team.id, userId |
| Seats generated | `app/routes/courses.$slug.purchase.tsx:222-243` | Team Admin (codes to hand out) | teamId, courseId, purchaseId, each `code` |
| Seat claimed (coupon redeemed) | `app/routes/redeem.$code.tsx:98-104` (set `redeemedByUserId`, `redeemedAt`); action `:185-212` | Team Admin (Seat used; this also makes the Team Licence non-refundable per GLOSSARY / ADR-0003); Student | coupon row (code, teamId, courseId, purchaseId), redeeming userId, purchase (country), course |
| Enrollment created by Claimed Seat (new Student on an Instructor's course) | `app/routes/redeem.$code.tsx:106-110` | Student; Instructor | enrollment row, coupon, course (via `getCourseById` `:207`) |
| Seat redeem rejected (on hold / refunded / country mismatch / already enrolled) | `app/routes/redeem.$code.tsx:57-96` (returns an error, nothing written) | Student (shown inline); Team Admin | coupon, userId, reason string |
| Course completed | **Never written.** `enrollments.completedAt` exists (`schema.ts:134`) and is read (`dashboard.tsx:27`, `instructor.$courseId.students.tsx:39`), but no code sets it. | (Student; Instructor) | n/a |
| Student becomes Lapsed | Derived: `app/lib/enrollments.ts:2` (`isLapsed`); the cause is the Enrollment deletion in the refund approval above | Instructor (sees Lapsed on the students page) | — |

### Comments and Instructor questions

| Event | Where (file:line) | Likely recipient(s) | Data available at that point |
| --- | --- | --- | --- |
| Top-level comment (question) posted on a lesson | `app/routes/courses.$slug.lessons.$lessonId.tsx:430-434` (`createComment`, `parentId` null); action `:898-910` | Instructor (course owner; the question appears in `/instructor/questions`, `instructor.questions.tsx:63-74`); Platform Admin (sees all questions) | userId, lessonId, body, `course` via `getCourseForLesson` (incl. instructorId), the inserted comment row (id, createdAt) |
| Reply posted on a lesson thread | same lines, `parentId` set; parent loaded at `:417-428` | Author of the parent comment (Student); Instructor; other repliers | parent comment (userId, body), reply body, lessonId, course |
| Instructor/Platform Admin answers a question from the queue | `app/routes/instructor.questions.tsx:152-156`; action `:188-224` (gated by `requireStaff` `:208`) | Student who asked (`question.userId`) | question row (userId, body, lessonId), course (courseTitle, courseSlug, instructorId), reply body, replier `access.userId` |
| Question unanswered for 3+ days | **Display only**: `app/routes/instructor.questions.tsx:160` (`STALE_AFTER_DAYS = 3`) and `:232-233`. No write. | Instructor; Platform Admin | Needs a scheduled job; none exists |
| Comment edited | `app/routes/courses.$slug.lessons.$lessonId.tsx:451-456` (`editedAt`) | (Repliers / Instructor) | commentId, new body |
| Comment deleted (by author or staff) | `app/routes/courses.$slug.lessons.$lessonId.tsx:471-476` (soft delete `deletedAt`); `isStaff` passed at `:935` | Author, when staff deleted it | commentId, deleting userId, isStaff, the existing row (author userId) |

### Quizzes and progress

| Event | Where (file:line) | Likely recipient(s) | Data available at that point |
| --- | --- | --- | --- |
| Quiz attempt submitted (pass/fail) | `app/routes/courses.$slug.lessons.$lessonId.tsx:602-611` (insert `quiz_attempts`) inside `computeResult` `:531-638`; action `:952-975` | Student; Instructor | userId, quizId, score, passed, grade, totalCorrect/totalQuestions, per-question results, attemptId. Pass is hard-coded as `score > 0.7` (`:599`) and does not use `quizzes.passingScore` (`schema.ts:163`). |
| Lesson marked complete | `app/routes/courses.$slug.lessons.$lessonId.tsx:218-243`; action `:947-950` | Student; Instructor | userId, lessonId, completedAt |
| Lesson started (marked in-progress on view) | `app/routes/courses.$slug.lessons.$lessonId.tsx:735` (in the **loader**), function `:245-269` | (Instructor) | userId, lessonId |
| Video watch event | `app/routes/api.video-tracking.ts:29-38` | (none obvious; Watched time feeds the Watch Limit) | userId, lessonId, eventType, positionSeconds |
| Quiz deleted, which wipes every Student's attempts | `app/routes/instructor.$courseId.lessons.$lessonId.quiz.tsx:201-219`; intent `delete-quiz` `:425` | Students with attempts | quizId, the attempts list (userIds) before deletion |

### Course lifecycle (Instructor / Platform Admin)

| Event | Where (file:line) | Likely recipient(s) | Data available at that point |
| --- | --- | --- | --- |
| Course created (always Draft) | `app/routes/instructor.new.tsx:60-72` | Platform Admin | title, slug, description, instructorId, categoryId |
| Course status changed by its Instructor (Draft/Published/Archived) | `app/routes/instructor.$courseId.tsx:154-161`; intent `:695-698` | Enrolled Students (archived); Platform Admin (published) | courseId, new status, `course` row before the change (old status), currentUserId |
| Course status changed by a Platform Admin | `app/routes/admin.courses.tsx:76-83`; intent `:141-144` | Instructor (course owner) | courseId, new status. The old status and instructorId need a lookup. |
| Course title/description/sales copy/price/PPP updated | `app/routes/instructor.$courseId.tsx:145-192`; intents `:685-720`, `:844-847` | (Enrolled Students, for content; Platform Admin) | courseId, new values, old `course` row |
| Modules/lessons added, renamed, reordered, moved, deleted | `app/routes/instructor.$courseId.tsx:722-842` | Enrolled Students (new content) | courseId, moduleId/lessonId, title |
| Lesson content/video edited | `app/routes/instructor.$courseId.lessons.$lessonId.tsx:66-90`; intent `:207-226` | Enrolled Students | lessonId, changed fields |
| Quiz created/edited | `app/routes/instructor.$courseId.lessons.$lessonId.quiz.tsx:172-199`, `:222-265`; intent `save-quiz` `:386` | Enrolled Students | lessonId, quiz title, passingScore |

### Ratings

| Event | Where (file:line) | Likely recipient(s) | Data available at that point |
| --- | --- | --- | --- |
| Course rated (new) | `app/routes/courses.$slug.tsx:358-362`; action `:453-481` (enrolled only) | Instructor | userId, courseId, rating (1–5). The course row is a lookup away (`getCourseBySlug` `:460`). |
| Rating changed | `app/routes/courses.$slug.tsx:349-356` | Instructor | userId, courseId, new rating, existing row (old rating) |

### Accounts and roles

| Event | Where (file:line) | Likely recipient(s) | Data available at that point |
| --- | --- | --- | --- |
| Sign-up (new Student) | `app/routes/signup.tsx:77-81` | Student (welcome); Platform Admin | name, email, role = student |
| Role changed by Platform Admin (e.g. Student → Instructor) | `app/routes/admin.users.tsx:60-67`; intent `:126-130` | The user whose role changed | userId, new role |
| Name/email changed by Platform Admin | `app/routes/admin.users.tsx:46-58`; intent `:119-124` | The user | userId, name, email |
| Own profile updated | `app/routes/settings.tsx:92` | (the user) | userId, changed fields |

## Gaps worth knowing (facts, not proposals)

- Only three emails are sent today: Refund Request raised, approved and declined. All three go to the buyer only. No Platform Admin or Instructor is told anything.
- No Notification storage exists: no `notifications` table, read state or per-user Channel preference (`schema.ts`). `users` has an `email` and no phone or push token (`schema.ts:47-57`), so only Email and In-app have recipient data.
- Pending, Issued and Failed Refund (GLOSSARY) have no representation in schema or code.
- Time-based events (refund window closing, stale question, Watch Limit reached) have no scheduler to fire from.
- Each refund email exists in two copies: the live builders in `refunds.server.ts`, and the unused `refund-emails.ts`.
- A Team Licence's Seat holders are anonymous until they redeem. Before that, only the Team Admin is reachable about Seat state.
