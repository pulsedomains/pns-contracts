// SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import {BaseRegistrarImplementation} from "./BaseRegistrarImplementation.sol";
import {StringUtils} from "./StringUtils.sol";
import {Resolver} from "../resolvers/Resolver.sol";
import {ENS} from "../registry/ENS.sol";
import {ReverseRegistrar} from "../reverseRegistrar/ReverseRegistrar.sol";
import {ReverseClaimer} from "../reverseRegistrar/ReverseClaimer.sol";
import {IETHRegistrarController, IPriceOracle} from "./IETHRegistrarController.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {INameWrapper} from "../wrapper/INameWrapper.sol";
import {ERC20Recoverable} from "../utils/ERC20Recoverable.sol";

error CommitmentTooNew(bytes32 commitment);
error CommitmentTooOld(bytes32 commitment);
error NameNotAvailable(string name);
error DurationTooShort(uint256 duration);
error ResolverRequiredWhenDataSupplied();
error UnexpiredCommitmentExists(bytes32 commitment);
error InsufficientValue();
error Unauthorised(bytes32 node);
error MaxCommitmentAgeTooLow();
error MaxCommitmentAgeTooHigh();
error IncorrectPricesFeed();
error MaximumBasisPoints();
error ExcuteCallFailed();

/**
 * @dev A registrar controller for registering and renewing names at fixed cost.
 */
contract ETHRegistrarController is
    Ownable,
    IETHRegistrarController,
    IERC165,
    ERC20Recoverable,
    ReverseClaimer
{
    using StringUtils for *;
    using Address for address;

    uint256 public constant MIN_REGISTRATION_DURATION = 28 days;
    bytes32 private constant ETH_NODE =
        0x55fb31aa6f23709345f51ac8d7e4ed79336defe55be2733bc226ed0f1f62f3c8;
    uint64 private constant MAX_EXPIRY = type(uint64).max;
    uint256 private constant TOTAL_REFERRAL_BASIS_POINTS = 10000;

    BaseRegistrarImplementation immutable base;
    IPriceOracle public prices;
    uint256 public immutable minCommitmentAge;
    uint256 public immutable maxCommitmentAge;
    ReverseRegistrar public immutable reverseRegistrar;
    INameWrapper public immutable nameWrapper;

    mapping(bytes32 => uint256) public commitments;

    bool public referralEnabled;
    uint256 public referralFeeBasisPoints;
    mapping(address => bool) private referrerBlacklists;

    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 baseCost,
        uint256 premium,
        uint256 expires
    );
    event NameRenewed(
        string name,
        bytes32 indexed label,
        uint256 cost,
        uint256 expires
    );
    event BlacklistChanged(address indexed account, bool banned);

    constructor(
        BaseRegistrarImplementation _base,
        IPriceOracle _prices,
        uint256 _minCommitmentAge,
        uint256 _maxCommitmentAge,
        ReverseRegistrar _reverseRegistrar,
        INameWrapper _nameWrapper,
        ENS _ens
    ) ReverseClaimer(_ens, msg.sender) {
        if (_maxCommitmentAge <= _minCommitmentAge) {
            revert MaxCommitmentAgeTooLow();
        }

        if (_maxCommitmentAge > block.timestamp) {
            revert MaxCommitmentAgeTooHigh();
        }

        base = _base;
        prices = _prices;
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
        reverseRegistrar = _reverseRegistrar;
        nameWrapper = _nameWrapper;

        referralEnabled = true;
        referralFeeBasisPoints = 1000;
    }

    function changePricesFeed(address _newPrices) external onlyOwner {
        prices = IPriceOracle(_newPrices);
    }

    function enableReferral(bool _newState) external onlyOwner {
        referralEnabled = _newState;
    }

    function changeReferralBasisPoints(
        uint256 _newBasisPoints
    ) external onlyOwner {
        if (_newBasisPoints > TOTAL_REFERRAL_BASIS_POINTS) {
            revert MaximumBasisPoints();
        }

        referralFeeBasisPoints = _newBasisPoints;
    }

    function setReferrerBlacklist(
        address wallet,
        bool isBlacklist
    ) external onlyOwner {
        referrerBlacklists[wallet] = isBlacklist;
        emit BlacklistChanged(wallet, isBlacklist);
    }

    function rentPrice(
        string memory name,
        uint256 duration
    ) public view override returns (IPriceOracle.Price memory price) {
        bytes32 label = keccak256(bytes(name));
        price = prices.price(name, base.nameExpires(uint256(label)), duration);
    }

    function valid(string memory name) public pure returns (bool) {
        return name.strlen() >= 3;
    }

    function available(string memory name) public view override returns (bool) {
        bytes32 label = keccak256(bytes(name));
        return valid(name) && base.available(uint256(label));
    }

    function makeCommitment(
        Registration calldata params
    ) public pure override returns (bytes32) {
        bytes32 label = keccak256(bytes(params.name));
        if (params.data.length > 0 && params.resolver == address(0)) {
            revert ResolverRequiredWhenDataSupplied();
        }
        return
            keccak256(
                abi.encode(
                    label,
                    params.owner,
                    params.duration,
                    params.secret,
                    params.resolver,
                    params.data,
                    params.reverseRecord,
                    params.ownerControlledFuses
                )
            );
    }

    function commit(bytes32 commitment) public override {
        if (commitments[commitment] + maxCommitmentAge >= block.timestamp) {
            revert UnexpiredCommitmentExists(commitment);
        }
        commitments[commitment] = block.timestamp;
    }

    function register(Registration calldata params) public payable override {
        IPriceOracle.Price memory price = rentPrice(
            params.name,
            params.duration
        );
        if (msg.value < price.base + price.premium) {
            revert InsufficientValue();
        }

        bytes32 commitment = makeCommitment(params);
        _consumeCommitment(params.name, params.duration, commitment);

        uint256 expires = nameWrapper.registerAndWrapETH2LD(
            params.name,
            params.owner,
            params.duration,
            params.resolver,
            params.ownerControlledFuses
        );

        if (params.data.length > 0) {
            _setRecords(
                params.resolver,
                keccak256(bytes(params.name)),
                params.data
            );
        }

        if (params.reverseRecord) {
            _setReverseRecord(params.name, params.resolver, msg.sender);
        }

        emit NameRegistered(
            params.name,
            keccak256(bytes(params.name)),
            params.owner,
            price.base,
            price.premium,
            expires
        );

        if (msg.value > (price.base + price.premium)) {
            payable(msg.sender).transfer(
                msg.value - (price.base + price.premium)
            );
        }

        uint256 referralFee = ((price.base + price.premium) *
            referralFeeBasisPoints) / TOTAL_REFERRAL_BASIS_POINTS;
        /**
         * Will not apply referral in cases of:
         * - referral address is 0x0
         * - users refer themselves
         * - referral fee is zero
         */
        if (
            referralEnabled &&
            params.referrer != address(0) &&
            params.referrer != params.owner &&
            !referrerBlacklists[params.referrer] &&
            referralFee > 0
        ) {
            _referral(params.referrer, referralFee);
        }
    }

    function renew(
        string calldata name,
        uint256 duration
    ) external payable override {
        bytes32 labelhash = keccak256(bytes(name));
        uint256 tokenId = uint256(labelhash);
        IPriceOracle.Price memory price = rentPrice(name, duration);
        if (msg.value < price.base) {
            revert InsufficientValue();
        }
        uint256 expires = nameWrapper.renew(tokenId, duration);

        if (msg.value > price.base) {
            payable(msg.sender).transfer(msg.value - price.base);
        }

        emit NameRenewed(name, labelhash, price.base, expires);
    }

    function withdraw() public {
        payable(owner()).transfer(address(this).balance);
    }

    function supportsInterface(
        bytes4 interfaceID
    ) external pure returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IETHRegistrarController).interfaceId;
    }

    /* Internal functions */

    function _consumeCommitment(
        string memory name,
        uint256 duration,
        bytes32 commitment
    ) internal {
        // Require an old enough commitment.
        if (commitments[commitment] + minCommitmentAge > block.timestamp) {
            revert CommitmentTooNew(commitment);
        }

        // If the commitment is too old, or the name is registered, stop
        if (commitments[commitment] + maxCommitmentAge <= block.timestamp) {
            revert CommitmentTooOld(commitment);
        }
        if (!available(name)) {
            revert NameNotAvailable(name);
        }

        delete (commitments[commitment]);

        if (duration < MIN_REGISTRATION_DURATION) {
            revert DurationTooShort(duration);
        }
    }

    function _setRecords(
        address resolverAddress,
        bytes32 label,
        bytes[] calldata data
    ) internal {
        // use hardcoded .pls namehash
        bytes32 nodehash = keccak256(abi.encodePacked(ETH_NODE, label));
        Resolver resolver = Resolver(resolverAddress);
        resolver.multicallWithNodeCheck(nodehash, data);
    }

    function _setReverseRecord(
        string memory name,
        address resolver,
        address owner
    ) internal {
        reverseRegistrar.setNameForAddr(
            msg.sender,
            owner,
            resolver,
            string.concat(name, ".pls")
        );
    }

    function _referral(address referrer, uint256 referralFee) internal {
        (bool success, ) = payable(referrer).call{value: referralFee}("");
        if (!success) {
            revert ExcuteCallFailed();
        }
    }
}
