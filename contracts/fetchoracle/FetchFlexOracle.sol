// SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import {UsingFetch} from "./UsingFetch.sol";

error PriceOutdated();
error ZeroValue();

contract FetchFlexOracle is UsingFetch {
    constructor(address payable _fetchAddress) UsingFetch(_fetchAddress) {}

    function latestAnswer() public view returns (int256) {
        bytes memory _plsQueryId = abi.encode(
            "SpotPrice",
            abi.encode("pls", "usd")
        );
        bytes32 _queryId = keccak256(_plsQueryId);

        (bytes memory _value, uint256 _timestampRetrieved) = getDataBefore(
            _queryId,
            block.timestamp - 20 minutes
        );
        if (_timestampRetrieved == 0) {
            revert ZeroValue();
        }
        if (block.timestamp - _timestampRetrieved > 24 hours) {
            revert PriceOutdated();
        }

        uint256 price = abi.decode(_value, (uint256));
        if (price == 0) {
            revert ZeroValue();
        }
        // convert value to chainlink oracle format
        return int256((price * 1e8) / 1e18);
    }
}
