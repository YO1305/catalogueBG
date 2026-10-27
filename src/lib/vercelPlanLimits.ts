export type VercelBillingPlan = "hobby" | "pro";

export type UsageMetricId = "blobStorageGb" | "blobSimpleOps" | "blobAdvancedOps" | "blobTransferGb";

export type UsageMetricLimit = {
  id: UsageMetricId;
  labelKey: string;
  included: number;
  unitKey: string;
  overageKey?: string;
  warnRatio: number;
};

export function resolveBillingPlan(): VercelBillingPlan {
  const raw = process.env.VERCEL_BILLING_PLAN?.trim().toLowerCase();
  return raw === "pro" ? "pro" : "hobby";
}

export function planLimits(plan: VercelBillingPlan): UsageMetricLimit[] {
  if (plan === "pro") {
    return [
      {
        id: "blobStorageGb",
        labelKey: "usage.metric.blobStorage",
        included: 0,
        unitKey: "usage.unit.gbMonth",
        overageKey: "usage.overage.blobStoragePro",
        warnRatio: 0.85,
      },
      {
        id: "blobSimpleOps",
        labelKey: "usage.metric.simpleOps",
        included: 0,
        unitKey: "usage.unit.ops",
        overageKey: "usage.overage.simpleOpsPro",
        warnRatio: 0.85,
      },
      {
        id: "blobAdvancedOps",
        labelKey: "usage.metric.advancedOps",
        included: 0,
        unitKey: "usage.unit.ops",
        overageKey: "usage.overage.advancedOpsPro",
        warnRatio: 0.85,
      },
      {
        id: "blobTransferGb",
        labelKey: "usage.metric.blobTransfer",
        included: 0,
        unitKey: "usage.unit.gb",
        overageKey: "usage.overage.blobTransferPro",
        warnRatio: 0.85,
      },
    ];
  }
  return [
    {
      id: "blobStorageGb",
      labelKey: "usage.metric.blobStorage",
      included: 1,
      unitKey: "usage.unit.gbMonth",
      overageKey: "usage.overage.blobStorageHobby",
      warnRatio: 0.8,
    },
    {
      id: "blobSimpleOps",
      labelKey: "usage.metric.simpleOps",
      included: 10_000,
      unitKey: "usage.unit.ops",
      overageKey: "usage.overage.simpleOpsHobby",
      warnRatio: 0.8,
    },
    {
      id: "blobAdvancedOps",
      labelKey: "usage.metric.advancedOps",
      included: 2_000,
      unitKey: "usage.unit.ops",
      overageKey: "usage.overage.advancedOpsHobby",
      warnRatio: 0.8,
    },
    {
      id: "blobTransferGb",
      labelKey: "usage.metric.blobTransfer",
      included: 10,
      unitKey: "usage.unit.gb",
      overageKey: "usage.overage.blobTransferHobby",
      warnRatio: 0.8,
    },
  ];
}

export type UsageLevel = "ok" | "warn" | "critical";

export function usageLevel(used: number, included: number, warnRatio: number): UsageLevel {
  if (included <= 0) return "ok";
  const ratio = used / included;
  if (ratio >= 1) return "critical";
  if (ratio >= warnRatio) return "warn";
  return "ok";
}
