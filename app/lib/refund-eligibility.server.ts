import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  coupons,
  lessonProgress,
  lessons,
  modules,
  purchases,
  refunds,
  videoWatchEvents,
  LessonProgressStatus,
  RefundStatus,
} from "~/db/schema";
import { getDiscountForCountry } from "~/lib/ppp";
import {
  assessRefundEligibility,
  type RefundEligibility,
} from "~/lib/refund-eligibility";

function getLatestPurchase(userId: number, courseId: number) {
  return db
    .select()
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)))
    .orderBy(sql`${purchases.createdAt} desc`)
    .get();
}

function getLessonIds(courseId: number): number[] {
  return db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId))
    .all()
    .map((row) => row.id);
}

function hasRequestedRefund(purchaseId: number): boolean {
  return !!db
    .select({ id: refunds.id })
    .from(refunds)
    .where(
      and(
        eq(refunds.purchaseId, purchaseId),
        eq(refunds.status, RefundStatus.Requested)
      )
    )
    .get();
}

function hasClaimedTeamSeat(purchaseId: number): boolean {
  return !!db
    .select({ id: coupons.id })
    .from(coupons)
    .where(and(eq(coupons.purchaseId, purchaseId), isNotNull(coupons.redeemedAt)))
    .get();
}

function countCompletedLessons(userId: number, lessonIds: number[]): number {
  if (lessonIds.length === 0) return 0;

  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, LessonProgressStatus.Completed),
        inArray(lessonProgress.lessonId, lessonIds)
      )
    )
    .get();

  return result?.count ?? 0;
}

function sumSecondsWatched(userId: number, lessonIds: number[]): number {
  if (lessonIds.length === 0) return 0;

  return db
    .select({
      furthest: sql<number>`max(${videoWatchEvents.positionSeconds})`,
    })
    .from(videoWatchEvents)
    .where(
      and(
        eq(videoWatchEvents.userId, userId),
        inArray(videoWatchEvents.lessonId, lessonIds)
      )
    )
    .groupBy(videoWatchEvents.lessonId)
    .all()
    .reduce((total, row) => total + row.furthest, 0);
}

/**
 * Whether the learner may request a refund on their latest purchase of the
 * course, and for how much. Null when they have not bought it.
 */
export function getRefundEligibility(
  userId: number,
  course: { id: number; price: number }
): { purchaseId: number; eligibility: RefundEligibility; amount: number } | null {
  const purchase = getLatestPurchase(userId, course.id);
  if (!purchase) return null;

  const lessonIds = getLessonIds(course.id);

  const eligibility = assessRefundEligibility({
    purchasedAt: purchase.createdAt,
    now: new Date(),
    hasRequestedRefund: hasRequestedRefund(purchase.id),
    hasClaimedTeamSeat: hasClaimedTeamSeat(purchase.id),
    secondsWatched: sumSecondsWatched(userId, lessonIds),
    completedLessons: countCompletedLessons(userId, lessonIds),
    totalLessons: lessonIds.length,
  });

  // A purchase made at a purchasing-power price is given back at that price,
  // not at the list price of the course.
  const amount =
    getDiscountForCountry(purchase.country) > 0
      ? purchase.amountPaid
      : course.price;

  return { purchaseId: purchase.id, eligibility, amount };
}
