import { ethers } from "ethers";

export const UINT64_MAX = "18446744073709551615";
export const UINT64_MINUS_ONE = ethers.BigNumber.from(UINT64_MAX)
  .sub(1)
  .toString();