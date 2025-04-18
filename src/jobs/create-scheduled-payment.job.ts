import {
  checkSourceAccount,
  getDestinationAccount,
  processPayment,
  transferRequestBodySchema,
} from "@/lib/payment-functions";
import { createJob } from "./task";

export const createScheduledPaymentJob = createJob({
  name: "schedule-payment",
  handler: async (
    transferRequest: (typeof transferRequestBodySchema)["_type"]
  ) => {
    console.log('running "createScheduledPaymentJob"');
    console.log(
      'transferRequest for job "createScheduledPaymentJob" :>> ',
      transferRequest
    );

    const { accountId } = transferRequest;

    const sourceAccountLookupResult = await checkSourceAccount(accountId!);
    if (sourceAccountLookupResult.error) {
      return sourceAccountLookupResult;
    }
    const sourceAccount = sourceAccountLookupResult.sourceAccount!;

    const destinationAccountResult = await getDestinationAccount(
      transferRequest,
      sourceAccount
    );

    if (destinationAccountResult.error) {
      return destinationAccountResult;
    }

    console.log("processing payment.... :>> ", {
      accountId,
      transferRequest,
      destinationAccountResult,
    });

    const processPaymentResult = await processPayment(
      accountId!,
      transferRequest,
      {
        name: destinationAccountResult.name!,
        entityId: destinationAccountResult.entityId!,
      }
    );

    if (processPaymentResult.error) {
      return processPayment;
    }

    return {
      success: true,
      transferRequest,
    };
  },
});
