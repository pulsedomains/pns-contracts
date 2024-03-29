# PNS

[![Build Status](https://travis-ci.org/pnsdomains/pns-contracts.svg?branch=master)](https://travis-ci.org/pnsdomains/pns-contracts)

For documentation of the PNS system, see [docs.pulse.domains](https://docs.pulse.domains/).

## npm package

This repo doubles as an npm package with the compiled JSON contracts

```js
import {
  BaseRegistrar,
  BaseRegistrarImplementation,
  BulkRenewal,
  PNS,
  PNSRegistry,
  PNSRegistryWithFallback,
  PLSRegistrarController,
  FIFSRegistrar,
  LinearPremiumPriceOracle,
  PriceOracle,
  PublicResolver,
  Resolver,
  ReverseRegistrar,
  StablePriceOracle,
  TestRegistrar,
} from '@pnsdomains/pns-contracts'
```

## Importing from solidity

```
// Registry
import '@pnsdomains/pns-contracts/contracts/registry/PNS.sol';
import '@pnsdomains/pns-contracts/contracts/registry/PNSRegistry.sol';
import '@pnsdomains/pns-contracts/contracts/registry/PNSRegistryWithFallback.sol';
import '@pnsdomains/pns-contracts/contracts/registry/ReverseRegistrar.sol';
import '@pnsdomains/pns-contracts/contracts/registry/TestRegistrar.sol';
// EthRegistrar
import '@pnsdomains/pns-contracts/contracts/ethregistrar/BaseRegistrar.sol';
import '@pnsdomains/pns-contracts/contracts/ethregistrar/BaseRegistrarImplementation.sol';
import '@pnsdomains/pns-contracts/contracts/ethregistrar/BulkRenewal.sol';
import '@pnsdomains/pns-contracts/contracts/ethregistrar/PLSRegistrarController.sol';
import '@pnsdomains/pns-contracts/contracts/ethregistrar/LinearPremiumPriceOracle.sol';
import '@pnsdomains/pns-contracts/contracts/ethregistrar/PriceOracle.sol';
import '@pnsdomains/pns-contracts/contracts/ethregistrar/StablePriceOracle.sol';
// Resolvers
import '@pnsdomains/pns-contracts/contracts/resolvers/PublicResolver.sol';
import '@pnsdomains/pns-contracts/contracts/resolvers/Resolver.sol';
```

## Accessing to binary file.

If your environment does not have compiler, you can access to the raw hardhat artifacts files at `node_modules/@pnsdomains/pns-contracts/artifacts/contracts/${modName}/${contractName}.sol/${contractName}.json`

## Contracts

## Registry

The PNS registry is the core contract that lies at the heart of PNS resolution. All PNS lookups start by querying the registry. The registry maintains a list of domains, recording the owner, resolver, and TTL for each, and allows the owner of a domain to make changes to that data. It also includes some generic registrars.

### PNS.sol

Interface of the PNS Registry.

### PNSRegistry

Implementation of the PNS Registry, the central contract used to look up resolvers and owners for domains.

### PNSRegistryWithFallback

The new implementation of the PNS Registry after [the 2020 PNS Registry Migration](https://docs.pulse.domains/pns-migration-february-2020/technical-description#new-pns-deployment).

### FIFSRegistrar

Implementation of a simple first-in-first-served registrar, which issues (sub-)domains to the first account to request them.

### ReverseRegistrar

Implementation of the reverse registrar responsible for managing reverse resolution via the .addr.reverse special-purpose TLD.

### TestRegistrar

Implementation of the `.test` registrar facilitates easy testing of PNS on the PulseChain test networks. Currently deployed on Ropsten network, it provides functionality to instantly claim a domain for test purposes, which expires 28 days after it was claimed.

## EthRegistrar

Implements an [PNS](https://pulse.domains/) registrar intended for the .pls TLD.

These contracts were audited by ConsenSys Diligence; the audit report is available [here](https://github.com/ConsenSys/pns-audit-report-2019-02).

### BaseRegistrar

BaseRegistrar is the contract that owns the TLD in the PNS registry. This contract implements a minimal set of functionality:

- The owner of the registrar may add and remove controllers.
- Controllers may register new domains and extend the expiry of (renew) existing domains. They can not change the ownership or reduce the expiration time of existing domains.
- Name owners may transfer ownership to another address.
- Name owners may reclaim ownership in the PNS registry if they have lost it.
- Owners of names in the interim registrar may transfer them to the new registrar, during the 1 year transition period. When they do so, their deposit is returned to them in its entirety.

This separation of concerns provides name owners strong guarantees over continued ownership of their existing names, while still permitting innovation and change in the way names are registered and renewed via the controller mechanism.

### EthRegistrarController

EthRegistrarController is the first implementation of a registration controller for the new registrar. This contract implements the following functionality:

- The owner of the registrar may set a price oracle contract, which determines the cost of registrations and renewals based on the name and the desired registration or renewal duration.
- The owner of the registrar may withdraw any collected funds to their account.
- Users can register new names using a commit/reveal process and by paying the appropriate registration fee.
- Users can renew a name by paying the appropriate fee. Any user may renew a domain, not just the name's owner.

The commit/reveal process is used to avoid frontrunning, and operates as follows:

1.  A user commits to a hash, the preimage of which contains the name to be registered and a secret value.
2.  After a minimum delay period and before the commitment expires, the user calls the register function with the name to register and the secret value from the commitment. If a valid commitment is found and the other preconditions are met, the name is registered.

The minimum delay and expiry for commitments exist to prevent miners or other users from effectively frontrunning registrations.

### SimplePriceOracle

SimplePriceOracle is a trivial implementation of the pricing oracle for the EthRegistrarController that always returns a fixed price per domain per year, determined by the contract owner.

### StablePriceOracle

StablePriceOracle is a price oracle implementation that allows the contract owner to specify pricing based on the length of a name, and uses a fiat currency oracle to set a fixed price in fiat per name.

## Resolvers

Resolver implements a general-purpose PNS resolver that is suitable for most standard PNS use cases. The public resolver permits updates to PNS records by the owner of the corresponding name.

PublicResolver includes the following profiles that implements different EIPs.

- ABIResolver = EIP 205 - ABI support (`ABI()`).
- AddrResolver = EIP 137 - Contract address interface. EIP 2304 - Multicoin support (`addr()`).
- ContentHashResolver = EIP 1577 - Content hash support (`contenthash()`).
- InterfaceResolver = EIP 165 - Interface Detection (`supportsInterface()`).
- NameResolver = EIP 181 - Reverse resolution (`name()`).
- PubkeyResolver = EIP 619 - SECP256k1 public keys (`pubkey()`).
- TextResolver = EIP 634 - Text records (`text()`).
- DNSResolver = Experimental support is available for hosting DNS domains on the PulseChain blockchain via PNS. [The more detail](https://veox-pns.readthedocs.io/en/latest/dns.html) is on the old PNS doc.

## Developer guide

### Prettier pre-commit hook

This repo runs a husky precommit to prettify all contract files to keep them consistent. Add new folder/files to `prettier format` script in package.json. If you need to add other tasks to the pre-commit script, add them to `.husky/pre-commit`

### How to setup

```
git clone https://github.com/pnsdomains/pns-contracts
cd pns-contracts
yarn
```

### How to run tests

```
yarn test
```

### How to publish

```
yarn pub
```

### Release flow

Smart contract development tends to take a long release cycle. To prevent unnecesarily dependency conflicts, please create a feature branch (`features/$BRNACH_NAME`) and raise a PR against the feature branch. The feature branch must be merged into master only after the smart contracts are deployed to the PulseChain Mainnet.

### Deploy

```bash
./node_modules/.bin/hardhat deploy --network mainnet --tags PNSRegistry
./node_modules/.bin/hardhat deploy --network mainnet --tags Root
./node_modules/.bin/hardhat deploy --network mainnet --tags StaticMetadataService
./node_modules/.bin/hardhat deploy --network mainnet --tags BaseRegistrarImplementation
./node_modules/.bin/hardhat deploy --network mainnet --tags ReverseRegistrar
./node_modules/.bin/hardhat deploy --network mainnet --tags UniversalResolver
./node_modules/.bin/hardhat deploy --network mainnet --tags ExponentialPremiumPriceOracle
./node_modules/.bin/hardhat deploy --network mainnet --tags OwnedResolver
./node_modules/.bin/hardhat deploy --network mainnet --tags NameWrapper
./node_modules/.bin/hardhat deploy --network mainnet --tags PLSRegistrarController
./node_modules/.bin/hardhat deploy --network mainnet --tags PublicResolver
./node_modules/.bin/hardhat deploy --network mainnet --tags StaticBulkRenewal
./node_modules/.bin/hardhat deploy --network mainnet --tags DNSSecOracle
./node_modules/.bin/hardhat deploy --network mainnet --tags OffchainDNSResolver
./node_modules/.bin/hardhat deploy --network mainnet --tags DNSRegistrar
./node_modules/.bin/hardhat deploy --network mainnet --tags FinalSetup
```
