// SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IPulseXPair {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

contract PulseXOracle {
    address public immutable WPLS;

    address immutable token0;
    address immutable token1;
    IPulseXPair public immutable PLS_USDC_PAIR;

    constructor(address _WPLS, IPulseXPair _pair) {
        WPLS = _WPLS;
        PLS_USDC_PAIR = _pair;

        token0 = PLS_USDC_PAIR.token0();
        token1 = PLS_USDC_PAIR.token1();
    }

    function latestAnswer() public view returns (int256) {
        (uint112 reserve0, uint112 reserve1, ) = PLS_USDC_PAIR.getReserves();
        if (token0 == WPLS) {
            return
                (int256(uint(reserve1)) * 1e8) /
                1e6 /
                (int256(uint(reserve0)) / 1e18);
        } else {
            return
                (int256(uint(reserve0)) * 1e8) /
                1e6 /
                (int256(uint(reserve1)) / 1e18);
        }
    }
}
