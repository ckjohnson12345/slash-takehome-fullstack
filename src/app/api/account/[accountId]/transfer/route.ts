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
  const today = new Date();
  const todayISOTokens = today.toISOString().split("-");
  todayISOTokens[0] = String(Number(todayISOTokens[0]) - 1);
  console.log("todayISOTokens :>> ", todayISOTokens);
  const yesterday = todayISOTokens.join("-");
  console.log("yesterday :>> ", yesterday);

  createScheduledPaymentJob.trigger(
    {
      params,
    },
    {
      startAfter: yesterday,
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
