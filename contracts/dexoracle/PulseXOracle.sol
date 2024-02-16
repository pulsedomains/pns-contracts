// SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

error PriceOutdated();
error ZeroValue();

interface IPulseXPair {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

contract PulseXOracle {
    address public constant WPLS =
        address(0xA1077a294dDE1B09bB078844df40758a5D0f9a27);

    address immutable token0;
    address immutable token1;
    IPulseXPair public immutable PLS_DAI_PAIR;

    constructor() {
        PLS_DAI_PAIR = IPulseXPair(0xE56043671df55dE5CDf8459710433C10324DE0aE);

        token0 = PLS_DAI_PAIR.token0();
        token1 = PLS_DAI_PAIR.token1();
    }

    function latestAnswer() public view returns (int256) {
        (uint112 reserve0, uint112 reserve1, ) = PLS_DAI_PAIR.getReserves();
        int256 price;
        if (token0 == WPLS) {
            price =
                (int256(uint(reserve1)) * 1e8) /
                1e18 /
                (int256(uint(reserve0)) / 1e18);
        } else {
            price =
                (int256(uint(reserve0)) * 1e8) /
                1e18 /
                (int256(uint(reserve1)) / 1e18);
        }

        if (price == 0) {
            revert ZeroValue();
        }

        return price;
    }
}
