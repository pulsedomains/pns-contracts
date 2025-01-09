// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./PNS.sol";

/**
 * A registrar that allocates subdomains to the first person to claim them.
 */
contract FIFSRegistrar {
    PNS pns;
    bytes32 rootNode;

    modifier only_owner(bytes32 label) {
        address currentOwner = pns.owner(
            keccak256(abi.encodePacked(rootNode, label))
        );
        require(currentOwner == address(0x0) || currentOwner == msg.sender);
        _;
    }

    /**
     * Constructor.
     * @param pnsAddr The address of the PNS registry.
     * @param node The node that this registrar administers.
     */
    constructor(PNS pnsAddr, bytes32 node) public {
        pns = pnsAddr;
        rootNode = node;
    }

    /**
     * Register a name, or change the owner of an existing registration.
     * @param label The hash of the label to register.
     * @param owner The address of the new owner.
     */
    function register(bytes32 label, address owner) public only_owner(label) {
        pns.setSubnodeOwner(rootNode, label, owner);
    }
}
