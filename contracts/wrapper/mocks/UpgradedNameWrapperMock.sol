// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import {INameWrapperUpgrade} from "../INameWrapperUpgrade.sol";
import "../../registry/PNS.sol";
import "../../ethregistrar/IBaseRegistrar.sol";
import {BytesUtils} from "../BytesUtils.sol";

contract UpgradedNameWrapperMock is INameWrapperUpgrade {
    using BytesUtils for bytes;

    bytes32 private constant PLS_NODE =
        0x55fb31aa6f23709345f51ac8d7e4ed79336defe55be2733bc226ed0f1f62f3c8;

    PNS public immutable pns;
    IBaseRegistrar public immutable registrar;

    constructor(PNS _pns, IBaseRegistrar _registrar) {
        pns = _pns;
        registrar = _registrar;
    }

    event NameUpgraded(
        bytes name,
        address wrappedOwner,
        uint32 fuses,
        uint64 expiry,
        address approved,
        bytes extraData
    );

    function wrapFromUpgrade(
        bytes calldata name,
        address wrappedOwner,
        uint32 fuses,
        uint64 expiry,
        address approved,
        bytes calldata extraData
    ) public {
        (bytes32 labelhash, uint256 offset) = name.readLabel(0);
        bytes32 parentNode = name.namehash(offset);
        bytes32 node = _makeNode(parentNode, labelhash);

        if (parentNode == PLS_NODE) {
            address registrant = registrar.ownerOf(uint256(labelhash));
            require(
                msg.sender == registrant &&
                    registrar.isApprovedForAll(registrant, address(this)),
                "No approval for registrar"
            );
        } else {
            address owner = pns.owner(node);
            require(
                msg.sender == owner &&
                    pns.isApprovedForAll(owner, address(this)),
                "No approval for registry"
            );
        }
        emit NameUpgraded(
            name,
            wrappedOwner,
            fuses,
            expiry,
            approved,
            extraData
        );
    }

    function _makeNode(
        bytes32 node,
        bytes32 labelhash
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(node, labelhash));
    }
}
