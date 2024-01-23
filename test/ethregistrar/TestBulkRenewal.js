const PNS = artifacts.require('./registry/PNSRegistry')
const PublicResolver = artifacts.require('./resolvers/PublicResolver')
const BaseRegistrar = artifacts.require('./BaseRegistrarImplementation')
const PLSRegistrarController = artifacts.require('./PLSRegistrarController')
const DummyOracle = artifacts.require('./DummyOracle')
const StablePriceOracle = artifacts.require('./StablePriceOracle')
const BulkRenewal = artifacts.require('./BulkRenewal')
const NameWrapper = artifacts.require('./wrapper/NameWrapper.sol')
const { deploy } = require('../test-utils/contracts')
const { EMPTY_BYTES32: EMPTY_BYTES } = require('../test-utils/constants')

const namehash = require('eth-ens-namehash')
const sha3 = require('web3-utils').sha3
const toBN = require('web3-utils').toBN
const { exceptions } = require('../test-utils')

const PLS_LABEL = sha3('pls')
const PLS_NAMEHASH = namehash.hash('pls')

contract('BulkRenewal', function (accounts) {
  let pns
  let resolver
  let baseRegistrar
  let controller
  let priceOracle
  let bulkRenewal
  let nameWrapper
  let reverseRegistrar

  const ownerAccount = accounts[0] // Account that owns the registrar
  const registrantAccount = accounts[1] // Account that owns test names
  const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

  before(async () => {
    // Create a registry
    pns = await PNS.new()
    // Create a base registrar
    baseRegistrar = await BaseRegistrar.new(pns.address, namehash.hash('pls'), {
      from: ownerAccount,
    })

    // Setup reverseRegistrar
    reverseRegistrar = await deploy('ReverseRegistrar', pns.address)

    await pns.setSubnodeOwner(EMPTY_BYTES, sha3('reverse'), accounts[0])
    await pns.setSubnodeOwner(
      namehash.hash('reverse'),
      sha3('addr'),
      reverseRegistrar.address,
    )

    // Create a name wrapper

    nameWrapper = await NameWrapper.new(
      pns.address,
      baseRegistrar.address,
      ownerAccount,
    )

    // Create a public resolver
    resolver = await PublicResolver.new(
      pns.address,
      nameWrapper.address,
      EMPTY_ADDRESS,
      EMPTY_ADDRESS,
    )

    // Set up a dummy price oracle and a controller
    const dummyOracle = await DummyOracle.new(toBN(100000000))
    priceOracle = await StablePriceOracle.new(
      dummyOracle.address,
      [0, 0, 4, 2, 1],
    )
    controller = await PLSRegistrarController.new(
      baseRegistrar.address,
      priceOracle.address,
      600,
      86400,
      EMPTY_ADDRESS,
      nameWrapper.address,
      pns.address,
      { from: ownerAccount },
    )
    var wrapperAddress = await controller.nameWrapper()
    await baseRegistrar.addController(controller.address, {
      from: ownerAccount,
    })
    await baseRegistrar.addController(ownerAccount, { from: ownerAccount })
    await baseRegistrar.addController(nameWrapper.address, {
      from: ownerAccount,
    })
    await nameWrapper.setController(controller.address, true, {
      from: ownerAccount,
    })
    // Create the bulk registration contract
    bulkRenewal = await BulkRenewal.new(pns.address)

    // Configure a resolver for .pls and register the controller interface
    // then transfer the .pls node to the base registrar.
    await pns.setSubnodeRecord(
      '0x0',
      PLS_LABEL,
      ownerAccount,
      resolver.address,
      0,
    )
    await resolver.setInterface(PLS_NAMEHASH, '0xeebf8169', controller.address)
    await pns.setOwner(PLS_NAMEHASH, baseRegistrar.address)

    // Register some names
    for (const name of ['test1', 'test2', 'test3']) {
      await baseRegistrar.register(sha3(name), registrantAccount, 31536000)
    }
  })

  it('should return the cost of a bulk renewal', async () => {
    await controller.rentPrice('test1', 86400)
    await controller.rentPrice('test2', 86400)
    const total = await bulkRenewal.rentPrice(['test1', 'test2'], 86400)
    assert.equal(total, 86400 * 2)
  })

  it('should raise an error trying to renew a nonexistent name', async () => {
    await exceptions.expectFailure(bulkRenewal.renewAll(['foobar'], 86400))
  })

  it('should permit bulk renewal of names', async () => {
    const oldExpiry = await baseRegistrar.nameExpires(sha3('test2'))
    const tx = await bulkRenewal.renewAll(['test1', 'test2'], 86400, {
      value: 86401 * 2,
    })
    assert.equal(tx.receipt.status, true)
    const newExpiry = await baseRegistrar.nameExpires(sha3('test2'))
    assert.equal(newExpiry - oldExpiry, 86400)
    // Check any excess funds are returned
    assert.equal(await web3.eth.getBalance(bulkRenewal.address), 0)
  })
})
