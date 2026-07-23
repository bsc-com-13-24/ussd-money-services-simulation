export const DEMO_PERSONAS = [
  {
    phone: "+265991000001",
    displayName: "Chisomo Banda",
    story: "Consistent saver — steady weekly pattern, rarely misses",
    accounts: [
      { institutionType: "telecom" as const, institutionName: "Airtel Money" },
      { institutionType: "bank" as const, institutionName: "National Bank of Malawi" },
    ],
    consistency: 0.92, // fraction of expected periodic transactions that actually occur
  },
  {
    phone: "+265991000002",
    displayName: "Thoko Mvula",
    story: "Irregular income, recovers well after gaps — the 'recovery' narrative",
    accounts: [{ institutionType: "telecom" as const, institutionName: "TNM Mpamba" }],
    consistency: 0.68,
  },
];
