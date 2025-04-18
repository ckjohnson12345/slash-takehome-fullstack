import { transferRequestBodySchema } from "@/lib/payment-functions";
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

    const error = null;

    if (error) {
      return {
        error: error,
      };
    }

    return {
      success: true,
      transferRequest,
    };
  },
});
