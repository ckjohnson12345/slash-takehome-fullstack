"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuthState } from "@/contexts/AuthStateContext";
import type { User } from "@/db/users.db";
import type { Account } from "@/db/accounts.db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import type { transactions } from "@/db/transactions.db";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer"; // Ensure DrawerBody is correctly exported
import { Button } from "@/components/ui/button"; // Correct casing to match other imports
import { Label } from "@/components/ui/label";
import { UserSelect } from "@/components/UserSelect";
import { MoneyInput } from "@/components/MoneyInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountSelect } from "@/components/AccountSelect";
import { Card } from "@/components/ui/card";
import type { transferRequestBodySchema } from "../api/account/[accountId]/transfer/route";
import { Loader2 } from "lucide-react"; // Add this import for the loading spinner
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Add this import for the error alert
import { Input } from "@/components/ui/input";

interface AccountWithBalance extends Account {
  balance: string;
}

interface AppState {
  user: User | null;
  accounts: AccountWithBalance[];
  loading: boolean;
  selectedAccount: string | null;
  transactions: (typeof transactions)["$inferSelect"][] | undefined;
}

interface Validation {
  [key: string]: string;
}

export default function AppPage() {
  const { impersonatedUserId } = useAuthState();
  const [appState, setAppState] = useState<AppState>({
    user: null,
    accounts: [],
    loading: true,
    selectedAccount: null,
    transactions: [],
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // State to control drawer visibility

  async function fetchUserData() {
    if (!impersonatedUserId) {
      setAppState((prevState) => ({ ...prevState, loading: false }));
      return;
    }

    try {
      const response = await fetch(`/api/users/${impersonatedUserId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      const data = await response.json();

      setAppState((prevState) => ({
        ...prevState,
        user: data.user,
        accounts: data.accounts,
        loading: false,
      }));
    } finally {
      setAppState((prevState) => ({ ...prevState, loading: false }));
    }
  }

  useEffect(() => {
    fetchUserData();
  }, [impersonatedUserId]);

  const fetchTransactions = async (accountId: string) => {
    setAppState((prevState) => ({
      ...prevState,
      selectedAccount: accountId,
      transactions: undefined,
    }));
    const response = await fetch(
      `/api/users/${impersonatedUserId}/transactions?accountId=${accountId}`
    );

    const data = await response.json();

    setAppState((prevState) => ({
      ...prevState,
      selectedAccount: accountId,
      transactions: data.transactions,
    }));
  };

  const handleTransfer = async (
    req: (typeof transferRequestBodySchema)["_type"]
  ) => {
    if (!impersonatedUserId) return;

    if (!appState.selectedAccount) {
      return;
    }

    const response = await fetch(
      `/api/account/${appState.selectedAccount}/transfer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      }
    );

    if (!response.ok) {
      throw await response.json();
    }

    await fetchUserData();
    await fetchTransactions(appState.selectedAccount);
    setIsDrawerOpen(false);
  };

  if (appState.loading) {
    return null;
  }

  if (!appState.user) {
    return (
      <div>
        No user selected. Please impersonate a user from the admin panel.
      </div>
    );
  }

  const maximumBalanceForSelectedAccount = (() => {
    const balance = appState.accounts.find(
      (a) => a.id === appState.selectedAccount
    )?.balance;
    if (!balance) {
      return 0;
    }
    return Number(balance);
  })();

  return (
    <div className="container mx-auto py-10 px-4 relative">
      {/* Add padding here */}
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarImage
                src={""}
                alt={`${appState.user.firstName} ${appState.user.lastName}`}
              />
              <AvatarFallback>
                {appState.user.firstName[0]}
                {appState.user.lastName[0]}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <Link href="/admin">
              <DropdownMenuItem className="cursor-pointer">
                Admin
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h1 className="text-2xl font-bold mb-5">
        <span className="mr-2">Hello, {appState.user.firstName}!</span>
        <span className="text-sm">
          (id: {appState.user.id.slice(0, 7)}...
          {appState.user.id.slice(-3)})
        </span>
      </h1>
      <div className="flex">
        <Card className="w-1/3 px-4 py-6 mr-4 min-w-[250px]">
          <h2 className="text-xl font-semibold mb-4">Accounts</h2>
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="pb-2">Name</th>
                <th className="pb-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {appState.accounts.map((account) => (
                <tr
                  key={account.id}
                  className={`border-t hover:bg-gray-100 cursor-pointer ${
                    appState.selectedAccount === account.id ? "bg-blue-100" : ""
                  }`}
                  onClick={() => fetchTransactions(account.id)}
                  onKeyUp={(e) =>
                    e.key === "Enter" && fetchTransactions(account.id)
                  } // Add keyboard event handler
                  tabIndex={0} // Make row focusable
                >
                  <td className="py-2">
                    <p className="font-semibold">{account.name}</p>
                    <p className="text-xs text-gray-600">
                      Acct: {account.accountNumber}
                    </p>
                  </td>
                  <td className="py-2 text-right">
                    {Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(Number(account.balance) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-6 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold ">
              {appState.selectedAccount
                ? "Transactions"
                : "Select an account to view transactions"}
            </h2>

            {appState.selectedAccount && (
              <Button
                className="mt-4"
                onClick={() => setIsDrawerOpen(true)}
                type="button" // Provide explicit type
              >
                Move Money
              </Button>
            )}
          </div>
          {appState.selectedAccount && (
            <table className="w-full table-fixed">
              <thead>
                <tr className="text-left">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {appState.transactions?.map((transaction) => (
                  <tr key={transaction.id} className="border-t">
                    <td className="py-2">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td
                      className="py-2 overflow-hidden text-ellipsis whitespace-nowrap"
                      title={transaction.description}
                    >
                      {transaction.description}
                    </td>
                    <td className="py-2 text-right">
                      {Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(transaction.amountCents / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
      <TransferDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedAccount={appState.selectedAccount}
        maximumBalanceForSelectedAccount={maximumBalanceForSelectedAccount}
        onTransfer={handleTransfer}
      />
    </div>
  );
}

enum ScheduledPaymentType {
  Instant = "instant",
  Scheduled = "scheduled",
  Recurring = "recurring",
}

enum RecurringPaymentPeriod {
  Daily = "daily",
  Weekly = "weekly",
  Monthly = "monthly",
}

function TransferDrawer({
  isOpen,
  onClose,
  selectedAccount,
  maximumBalanceForSelectedAccount,
  onTransfer,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedAccount: string | null;
  maximumBalanceForSelectedAccount: number;
  onTransfer: (
    req: (typeof transferRequestBodySchema)["_type"]
  ) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [toAccount, setToAccount] = useState<Account | undefined>(undefined);
  const [toUser, setToUser] = useState<User | undefined>(undefined);
  const [transferType, setTransferType] = useState<"account" | "user">(
    "account"
  );
  const [isLoading, setIsLoading] = useState(false); // Add this line
  const [error, setError] = useState<string | null>(null); // Add this line for error state

  /* Begin scheduled payments code */

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, []);

  const timeFormatter = useMemo(() => {
    return new Intl.DateTimeFormat("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, []);

  // Get defaults for scheduledPaymentDate and scheduledPaymentTime
  const SCHEDULED_PAYMENT_DEFAULTS = useMemo(() => {
    const today = new Date();
    const todayMinutes = today.getHours() * 60 + today.getMinutes();
    const todayEarliestTime = todayMinutes - (todayMinutes % 30) + 30;
    const todayString = dateFormatter.format(today);

    console.log("todayString :>> ", todayString);
    console.log("todayEarliestTime :>> ", todayEarliestTime);

    return {
      date: todayString,
      time: todayEarliestTime,
    };
  }, []);

  const [scheduledPaymentType, setScheduledPaymentType] =
    useState<ScheduledPaymentType>(ScheduledPaymentType.Instant);
  const [scheduledPaymentDate, setScheduledPaymentDate] = useState<string>(
    SCHEDULED_PAYMENT_DEFAULTS.date
  );
  const [recurringPaymentPeriod, setRecurringPaymentPeriod] =
    useState<RecurringPaymentPeriod>(RecurringPaymentPeriod.Daily);

  // Defined in increments of 30 minutes; 0 === 12:00pm, 120 === 2:00am, etc.
  const [scheduledPaymentTime, setScheduledPaymentTime] = useState<number>(
    SCHEDULED_PAYMENT_DEFAULTS.time
  );

  const [validations, setValidations] = useState<Validation>({});

  const isTransferButtonDisabled = () => {
    const hasNoAmount = !amount;
    const hasNoTargetAccount = transferType === "account" && !toAccount;
    const hasNoTargetUser = transferType !== "account" && !toUser;
    const hasValidationErrors = Object.entries(validations).length > 0;

    return (
      hasNoAmount ||
      hasNoTargetAccount ||
      hasNoTargetUser ||
      hasValidationErrors
    );
  };

  function handleClose() {
    setAmount("");
    setToAccount(undefined);
    setToUser(undefined);
    setTransferType("account");

    setScheduledPaymentType(ScheduledPaymentType.Instant);
    setScheduledPaymentDate(SCHEDULED_PAYMENT_DEFAULTS.date);
    setScheduledPaymentTime(SCHEDULED_PAYMENT_DEFAULTS.time);
    setRecurringPaymentPeriod(RecurringPaymentPeriod.Daily);
    setValidations({});

    onClose();
  }

  const handleTransfer = async () => {
    if (!selectedAccount) return;
    setIsLoading(true);
    setError(null); // Clear any previous errors
    try {
      const entityId = transferType === "account" ? toAccount?.id : toUser?.id;
      if (!entityId) {
        throw new Error("Please select a destination account or user.");
      }

      console.log(
        await onTransfer({
          type: transferType,
          entityId,
          amount: Number(amount), // Convert to cents
        })
      );
      handleClose();
    } catch (err) {
      setError(
        err &&
          typeof err === "object" &&
          "error" in err &&
          typeof err.error === "string"
          ? err.error
          : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const [earliestPaymentDate, latestPaymentDate] = useMemo(() => {
    // Get the earliest available date for schedule payment datepicker
    const today = new Date();
    const earliestPaymentDate = SCHEDULED_PAYMENT_DEFAULTS.date;

    const latestPaymentDate = earliestPaymentDate
      .split("-")
      .map((token, index) => {
        if (index === 0) {
          // Increment the year by 1
          const year = Number(token);
          return String(year + 1);
        } else {
          return token;
        }
      })
      .join("-");

    return [earliestPaymentDate, latestPaymentDate];
  }, []);

  const handlePaymentDateBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const dateInput = event.target.value;

    validatePaymentDate(dateInput);
  };

  const validatePaymentDate = (dateInput: string) => {
    let validationMessage: string | undefined = undefined;

    // Check incoming date Input for blank state, minimum date, and maximum date.
    // Note: We can compare these date strings directly, since ISO date strings are lexographically sortable!
    if (
      scheduledPaymentType === ScheduledPaymentType.Scheduled &&
      (typeof dateInput === "undefined" || dateInput === "")
    ) {
      validationMessage = `Payment Date is required`;
    } else if (dateInput < earliestPaymentDate) {
      validationMessage = `Scheduled payment cannot occur before ${earliestPaymentDate}`;
    } else if (dateInput === earliestPaymentDate) {
      // Set the time field to be after the current time, in 30-minute increments
    } else if (dateInput > latestPaymentDate) {
      validationMessage = `Scheduled payment cannot occur after ${latestPaymentDate}`;
    }

    if (validationMessage) {
      setValidations({
        ...validations,
        scheduledPaymentDate: validationMessage,
      });
    } else if (typeof validations["scheduledPaymentDate"] !== "undefined") {
      const newValidations = { ...validations };
      delete newValidations["scheduledPaymentDate"];
      setValidations(newValidations);
    }
  };

  const handlePaymentDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const dateInput = event.target.value;
      validatePaymentDate(dateInput);
      setScheduledPaymentDate(dateInput);
    },
    [earliestPaymentDate, latestPaymentDate, validations, setValidations]
  );

  const scheduledPaymentTimeOptions = useMemo(() => {
    let selectElements = [];

    const startingTime =
      scheduledPaymentDate === SCHEDULED_PAYMENT_DEFAULTS.date
        ? SCHEDULED_PAYMENT_DEFAULTS.time
        : 0;

    for (var i = startingTime; i < 1440; i = i + 30) {
      const time = new Date(0, 0, 0, 0, i);
      const timeLabel = timeFormatter.format(time);

      selectElements.push(
        <SelectItem key={String(i)} value={String(i)}>
          {timeLabel}
        </SelectItem>
      );
    }

    setScheduledPaymentTime(startingTime);

    return selectElements;
  }, [scheduledPaymentDate]);

  const handleScheduledPaymentTimeChange = (newTime: string) => {
    setScheduledPaymentTime(Number(newTime));
  };

  const handleScheduledPaymentTypeChange = (newPaymentType: string) => {
    // When scheduled payment type changes, reset related fields to their default value
    setScheduledPaymentDate(SCHEDULED_PAYMENT_DEFAULTS.date);
    setScheduledPaymentTime(SCHEDULED_PAYMENT_DEFAULTS.time);
    setRecurringPaymentPeriod(RecurringPaymentPeriod.Daily);

    // Clear validations for `scheduledPaymentDate`
    const newValidations = { ...validations };
    delete newValidations["scheduledPaymentDate"];
    setValidations(newValidations);

    setScheduledPaymentType(newPaymentType as ScheduledPaymentType);
  };

  const handleRecurringPaymentPeriodChange = (
    newPaymentPeriod: RecurringPaymentPeriod
  ) => {
    setRecurringPaymentPeriod(newPaymentPeriod);
  };

  return (
    <Drawer open={isOpen} onClose={handleClose}>
      <DrawerTitle>Move Money</DrawerTitle>
      <DrawerContent className="max-w-md mx-auto my-auto">
        <DrawerHeader>
          <h2 className="text-2xl font-bold mb-4">Move Money</h2>
        </DrawerHeader>
        <div className="mx-4 mb-8">
          {error && (
            <Alert variant="destructive" className="">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <div className="mb-4 px-4 flex flex-col items-center">
          <MoneyInput
            autoFocus
            value={amount}
            onChange={(value) => setAmount(value)}
            maxAmountCents={maximumBalanceForSelectedAccount}
          />
          <Label className="text-gray-400 mt-4">Amount</Label>
          <p className="text-gray-400 mt-2">
            Balance after{" "}
            {Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(
              (maximumBalanceForSelectedAccount - Number(amount)) / 100
            )}
          </p>
        </div>
        <div className="mb-4 px-4">
          <Label>Destination</Label>
          <div className="flex mt-1 gap-2">
            {transferType === "user" ? (
              <UserSelect
                value={toUser}
                onChange={(value) => setToUser(value)}
              />
            ) : (
              <AccountSelect
                value={toAccount}
                onChange={(value) => setToAccount(value)}
                excludeAccountId={selectedAccount || undefined}
              />
            )}
            <Select
              value={transferType}
              onValueChange={
                setTransferType as Dispatch<SetStateAction<string>>
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account">Account</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mb-4 px-4">
          <Label>Payment Delivery</Label>
          <div className="flex mt-1 gap-2">
            <Select
              value={scheduledPaymentType}
              onValueChange={handleScheduledPaymentTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ScheduledPaymentType.Instant}>
                  Instant
                </SelectItem>
                <SelectItem value={ScheduledPaymentType.Scheduled}>
                  Schedule Later
                </SelectItem>
                <SelectItem value={ScheduledPaymentType.Recurring}>
                  Recurring
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {scheduledPaymentType === ScheduledPaymentType.Scheduled && (
          <div className="mb-4 px-4">
            <Label>Payment Date</Label>
            <div className="flex mt-1 gap-2">
              <Input
                type="date"
                value={scheduledPaymentDate ?? ""}
                min={earliestPaymentDate}
                max={latestPaymentDate}
                placeholder={"MM/DD/YYYY"}
                name="scheduledPaymentDate"
                validation={validations["scheduledPaymentDate"]}
                onBlur={handlePaymentDateBlur}
                onChange={handlePaymentDateChange}
              ></Input>
              <Select
                value={String(scheduledPaymentTime)}
                onValueChange={handleScheduledPaymentTimeChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Time of delivery" />
                </SelectTrigger>
                <SelectContent>{scheduledPaymentTimeOptions}</SelectContent>
              </Select>
            </div>
          </div>
        )}
        {scheduledPaymentType === ScheduledPaymentType.Recurring && (
          <div className="mb-4 px-4">
            <Label>Recurring Payment Period</Label>
            <p className="text-xs mb-4">
              First payment will occur immediately, then repeat for the
              specified period.
            </p>
            <Select
              value={recurringPaymentPeriod}
              onValueChange={handleRecurringPaymentPeriodChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RecurringPaymentPeriod.Daily}>
                  Daily
                </SelectItem>
                <SelectItem value={RecurringPaymentPeriod.Weekly}>
                  Weekly
                </SelectItem>
                <SelectItem value={RecurringPaymentPeriod.Monthly}>
                  Monthly
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <DrawerFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            type="button"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleTransfer}
            type="button"
            disabled={isTransferButtonDisabled() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              "Transfer"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
