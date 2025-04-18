import { createJob } from "./task";

export const createScheduledPaymentJob = createJob({
  name: "schedule-payment",
  handler: async (params: object) => {
    console.log('running "createScheduledPaymentJob"');
    console.log('params for job "createScheduledPaymentJob" :>> ', params);

    return {
      success: true,
    };
  },
});
