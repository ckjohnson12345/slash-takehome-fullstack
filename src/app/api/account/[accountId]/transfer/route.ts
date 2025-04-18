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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }
}
