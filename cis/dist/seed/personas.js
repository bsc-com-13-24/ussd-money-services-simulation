"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEMO_PERSONAS = void 0;
exports.DEMO_PERSONAS = [
    {
        phone: "+265991000001",
        displayName: "Chisomo Banda",
        story: "Consistent saver — steady weekly pattern, rarely misses",
        accounts: [
            { institutionType: "telecom", institutionName: "Airtel Money" },
            { institutionType: "bank", institutionName: "National Bank of Malawi" },
        ],
        consistency: 0.92, // fraction of expected periodic transactions that actually occur
    },
    {
        phone: "+265991000002",
        displayName: "Thoko Mvula",
        story: "Irregular income, recovers well after gaps — the 'recovery' narrative",
        accounts: [{ institutionType: "telecom", institutionName: "TNM Mpamba" }],
        consistency: 0.68,
    },
];
