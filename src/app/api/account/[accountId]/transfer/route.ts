import { type NextRequest, NextResponse } from "next/server";
import { createScheduledPaymentJob } from "@/jobs/create-scheduled-payment.job";
import {
  checkSourceAccount,
  getDestinationAccount,
  processPayment,
  transferRequestBodySchema,
} from "@/lib/payment-functions";

export async function PUT(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const scheduledPaymentDate = "2025-04-18";
  const scheduledPaymentTime = 1140; // 2:00pm

  const testTransferRequest: (typeof transferRequestBodySchema)["_type"] = {
    type: "account",
    entityId: "12b17131-33c5-4c3f-a43e-6b39d055a89a", // "Account 2", for user "Charlie"
    amount: 100,
    scheduledPaymentType: "scheduled",
    scheduledPaymentDate: scheduledPaymentDate,
    scheduledPaymentTime: scheduledPaymentTime,
    accountId: params.accountId,
  };

  const scheduledPaymentDayMS =
    new Date(scheduledPaymentDate).getTime() + scheduledPaymentTime * 60 * 1000;
  const scheduledPaymentDay = new Date(scheduledPaymentDayMS);

  createScheduledPaymentJob.trigger(
    {
      params: testTransferRequest,
    },
    {
      startAfter: scheduledPaymentDay,
    }
  );

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;
    const body = await req.json();

    // For recurring payments, send the first payment instantly, like you would for instant transfers.
    if (
      body.scheduledPaymentType === "instant" ||
      body.scheduledPaymentType === "recurring"
    ) {
      const sourceAccountLookupResult = await checkSourceAccount(accountId);
      if (sourceAccountLookupResult.error) {
        return NextResponse.json(sourceAccountLookupResult, { status: 404 });
      }
      const sourceAccount = sourceAccountLookupResult.sourceAccount!;

      const destinationAccountResult = await getDestinationAccount(
        body,
        sourceAccount
      );
      if (destinationAccountResult.error) {
        return NextResponse.json(destinationAccountResult, {
          status: 404,
        });
      }

      const processPaymentResult = await processPayment(accountId, body, {
        name: destinationAccountResult.name!,
        entityId: destinationAccountResult.entityId!,
      });

      if (processPaymentResult.error) {
        return NextResponse.json(
          { error: processPaymentResult.error },
          { status: 400 }
        );
      }
    }

    if (body.scheduledPaymentType === "scheduled") {
      const d = new Date(body.scheduledPaymentDate);
      const date = d.getTime();
      const dateTimeMS = date + body.scheduledPaymentTime * 60 * 1000;
      const dateTimeMSWithOffset =
        dateTimeMS + d.getTimezoneOffset() * 60 * 1000;
      const utcDate = new Date(dateTimeMSWithOffset).toISOString();

      const jobId = await createScheduledPaymentJob.trigger(
        {
          params: {
            ...body,
            accountId,
          },
        },
        {
          startAfter: utcDate,
        }
      );

      console.log("scheduled payment jobId :>> ", jobId);
    }

    if (body.scheduledPaymentType === "recurring") {
      // TODO: Implement recurring payments.
      /**
       *  Here's how I'd implement the recurring payments part of this assignment.
       *    - Create a `recurring-payments` table in the DB, associated with a user or account.
       *       - Should register the amount, recurringPaymentPeriod, and time that the initial payment went through. Recurring payments should be processed at the same time of day the user initiated the initial request
       *    - Create a daily job, that runs once at 12:01am every day, that goes through the `recurring-payments` table, and creates jobs to run later that day for any recurring payments that need to be scheduled.
       *      - Should also check the list of jobs scheduled to be processed today, so that we're not duplicating; idempotency is good in job logic.
       *    - Add an element to the UI showing the user which recurring payments are scheduled for which account
       */
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }
}
