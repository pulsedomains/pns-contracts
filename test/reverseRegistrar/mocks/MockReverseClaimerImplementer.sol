//SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 <0.9.0;

import {PNS} from "../../../contracts/registry/PNS.sol";
import {ReverseClaimer} from "../../../contracts/reverseRegistrar/ReverseClaimer.sol";

contract MockReverseClaimerImplementer is ReverseClaimer {
    constructor(PNS pns, address claimant) ReverseClaimer(pns, claimant) {}
}
