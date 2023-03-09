// SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./IPriceOracle.sol";

interface IETHRegistrarController {
    struct Registration {
        string name;
        address owner;
        uint256 duration;
        bytes32 secret;
        address resolver;
        bytes[] data;
        bool reverseRecord;
        uint16 ownerControlledFuses;
        address referrer;
    }

    function rentPrice(
        string memory,
        uint256
    ) external view returns (IPriceOracle.Price memory);

    function available(string memory) external returns (bool);

    function makeCommitment(Registration calldata) external returns (bytes32);

    function commit(bytes32) external;

    function register(Registration calldata) external payable;

    function renew(string calldata, uint256) external payable;
}
