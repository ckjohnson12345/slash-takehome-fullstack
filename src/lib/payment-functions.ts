import { accounts } from "@/db/accounts.db";
import { db } from "@/db/db";
import { eq, and, sum } from "drizzle-orm";
import { z } from "zod";
import { transactions } from "@/db/transactions.db";

export const transferRequestBodySchema = z.object({
  type: z.enum(["user", "account"]),
  entityId: z.string(),
  amount: z.number().positive(),
  scheduledPaymentType: z.enum(["instant", "scheduled", "recurring"]),
  scheduledPaymentDate: z.string().optional(),
  scheduledPaymentTime: z.number().positive().optional(),
  recurringPaymentPeriod: z.enum(["daily", "weekly", "monthly"]).optional(),
  accountId: z.string().optional(), // TODO: Refactor the `jobs.trigger` function to accept a typed data object, instead of just one `Params` object, which is limited
});

export const checkSourceAccount = async (accountId: string) => {
  const sourceAccount = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (sourceAccount.length === 0) {
    return {
      error: "Source account not found",
    };
  } else {
    return {
      success: true,
      sourceAccount,
    };
  }
};

export const getDestinationAccount = async (
  transferRequest: (typeof transferRequestBodySchema)["_type"],
  sourceAccount: { userId: string }[] // TODO: Type this
) => {
  const { type, entityId } = transferRequest;

  if (type === "account") {
    // Check if the destination account exists and belongs to the same user
    const destinationAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, entityId))
      .limit(1);

    if (destinationAccount.length === 0) {
      return { error: "Destination account not found" };
    }

    // Assert that the destination account belongs to the same user
    if (destinationAccount[0].userId !== sourceAccount[0].userId) {
      return {
        error: "Cannot transfer to an account owned by a different user",
      };
    }

    return {
      success: true,
      entityId,
      name: destinationAccount[0].name,
    };
  }

  // If type is "user", find the user's Primary account
  const userAccount = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, entityId), eq(accounts.name, "Primary")))
    .limit(1);

  if (userAccount.length === 0) {
    return { error: "Destination user has no default account" };
  }
  return {
    entityId: userAccount[0].id,
    name: `Primary (${userAccount[0].userId})`,
  };
};

export const processPayment = async (
  accountId: string,
  transferRequest: (typeof transferRequestBodySchema)["_type"],
  destinationAccount: { name: string; entityId: string }
) => {
  // Start a transaction

  const { amount, type } = transferRequest;

  try {
    const res = await db.transaction(async (tx) => {
      // Calculate the source account balance by summing all transactions
      const balanceResult = await tx
        .select({ balance: sum(transactions.amountCents) })
        .from(transactions)
        .where(and(eq(transactions.accountId, accountId)));

      const sourceBalance = Number(balanceResult[0]?.balance ?? 0);

      console.log({ sourceBalance, amount });
      if (sourceBalance < amount) {
        return { error: "Insufficient funds" };
      }

      const timestamp = new Date();
      const bookTraceId = crypto.randomUUID();
      // Create transaction records
      await tx
        .insert(transactions)
        .values([
          {
            id: crypto.randomUUID(),
            traceId: bookTraceId,
            amountCents: -amount, // Convert dollars to cents
            description: `Transfer to ${type === "user" ? "user" : "account"} ${
              destinationAccount.name
            }`,
            type: "book",
            accountId: accountId,
            createdAt: timestamp,
          },
          {
            id: crypto.randomUUID(),
            traceId: bookTraceId,
            amountCents: amount, // Convert dollars to cents
            description: `Transfer from account ${accountId}`,
            type: "book",
            accountId: destinationAccount.entityId,
            createdAt: timestamp,
          },
        ])
        .returning();

      return {
        success: true,
      };
    });

    return res;
  } catch (error) {
    return {
      error: "Transfer failed",
    };
  }
};
