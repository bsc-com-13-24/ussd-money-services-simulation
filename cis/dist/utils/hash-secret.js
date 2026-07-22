"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// One-off CLI utility: run `ts-node src/utils/hash-secret.ts <plaintext-secret>`
// to generate the bcrypt hash to paste into TRUSTED_CLIENTS in .env,
// for both this service and whichever value Mphamvu Hub sends as
// Client-Secret when calling CIS.
const bcrypt_1 = __importDefault(require("bcrypt"));
const plaintext = process.argv[2];
if (!plaintext) {
    console.error("Usage: ts-node src/utils/hash-secret.ts <plaintext-secret>");
    process.exit(1);
}
bcrypt_1.default.hash(plaintext, 10).then((hash) => {
    console.log(hash);
});
