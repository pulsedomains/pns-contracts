// SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "../registry/PNS.sol";
import "./PLSRegistrarController.sol";
import "./IPLSRegistrarController.sol";
import "../resolvers/Resolver.sol";
import "./IBulkRenewal.sol";
import "./IPriceOracle.sol";

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract BulkRenewal is IBulkRenewal {
    bytes32 private constant PLS_NAMEHASH =
        0x55fb31aa6f23709345f51ac8d7e4ed79336defe55be2733bc226ed0f1f62f3c8;

    PNS public immutable pns;

    constructor(PNS _pns) {
        pns = _pns;
    }

    function getController() internal view returns (PLSRegistrarController) {
        Resolver r = Resolver(pns.resolver(PLS_NAMEHASH));
        return
            PLSRegistrarController(
                r.interfaceImplementer(
                    PLS_NAMEHASH,
                    type(IPLSRegistrarController).interfaceId
                )
            );
    }

    function rentPrice(
        string[] calldata names,
        uint256 duration
    ) external view override returns (uint256 total) {
        PLSRegistrarController controller = getController();
        uint256 length = names.length;
        for (uint256 i = 0; i < length; ) {
            IPriceOracle.Price memory price = controller.rentPrice(
                names[i],
                duration
            );
            unchecked {
                ++i;
                total += (price.base + price.premium);
            }
        }
    }

    function renewAll(
        string[] calldata names,
        uint256 duration
    ) external payable override {
        PLSRegistrarController controller = getController();
        uint256 length = names.length;
        uint256 total;
        for (uint256 i = 0; i < length; ) {
            IPriceOracle.Price memory price = controller.rentPrice(
                names[i],
                duration
            );
            uint256 totalPrice = price.base + price.premium;
            controller.renew{value: totalPrice}(names[i], duration);
            unchecked {
                ++i;
                total += totalPrice;
            }
        }
        // Send any excess funds back
        payable(msg.sender).transfer(address(this).balance);
    }

    function supportsInterface(
        bytes4 interfaceID
    ) external pure returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IBulkRenewal).interfaceId;
    }
}
