// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./PNS.sol";

/**
 * A registrar that allocates subdomains to the first person to claim them, but
 * expires registrations a fixed period after they're initially claimed.
 */
contract TestRegistrar {
    uint256 constant registrationPeriod = 4 weeks;

    PNS public immutable pns;
    bytes32 public immutable rootNode;
    mapping(bytes32 => uint256) public expiryTimes;

    /**
     * Constructor.
     * @param pnsAddr The address of the PNS registry.
     * @param node The node that this registrar administers.
     */
    constructor(PNS pnsAddr, bytes32 node) {
        pns = pnsAddr;
        rootNode = node;
    }

    /**
     * Register a name that's not currently registered
     * @param label The hash of the label to register.
     * @param owner The address of the new owner.
     */
    function register(bytes32 label, address owner) public {
        require(expiryTimes[label] < block.timestamp);

        expiryTimes[label] = block.timestamp + registrationPeriod;
        pns.setSubnodeOwner(rootNode, label, owner);
    }
}
