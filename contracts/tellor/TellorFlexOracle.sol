// SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import {UsingTellor} from "./UsingTellor.sol";

error PriceOutdated();

contract TellorFlexOracle is UsingTellor {
    constructor(address payable _tellorAddress) UsingTellor(_tellorAddress) {}

    function latestAnswer() public view returns (int256) {
        bytes memory _queryData = abi.encode(
            "SpotPrice",
            abi.encode("pls", "usd")
        );
        bytes32 _queryId = keccak256(_queryData);

        (bytes memory _value, uint256 _timestampRetrieved) = getDataBefore(
            _queryId,
            block.timestamp - 20 minutes
        );
        if (block.timestamp - _timestampRetrieved > 24 hours) {
            revert PriceOutdated();
        }

        uint256 price = abi.decode(_value, (uint256));
        // convert value to chainlink oracle format
        return int256((price * 1e8) / 1e18);
    }
}
