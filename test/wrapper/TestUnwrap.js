const { ethers } = require('hardhat')
const { use, expect } = require('chai')
const { solidity } = require('ethereum-waffle')
const { labelhash, namehash, encodeName, FUSES } = require('../test-utils/pns')
const { deploy } = require('../test-utils/contracts')
const { EMPTY_BYTES32, EMPTY_ADDRESS } = require('../test-utils/constants')

use(solidity)

const ROOT_NODE = EMPTY_BYTES32

const DAY = 86400

const { CANNOT_UNWRAP, CAN_DO_EVERYTHING } = FUSES

describe('TestUnwrap', () => {
  let PnsRegistry
  let BaseRegistrar
  let NameWrapper
  let TestUnwrap
  let MetaDataservice
  let signers
  let account
  let account2
  let result

  before(async () => {
    signers = await ethers.getSigners()
    account = await signers[0].getAddress()
    account2 = await signers[1].getAddress()
    hacker = await signers[2].getAddress()

    PnsRegistry = await deploy('PNSRegistry')

    BaseRegistrar = await deploy(
      'BaseRegistrarImplementation',
      PnsRegistry.address,
      namehash('pls'),
    )

    await BaseRegistrar.addController(account)
    await BaseRegistrar.addController(account2)

    const ReverseRegistrar = await deploy(
      'ReverseRegistrar',
      PnsRegistry.address,
    )

    await PnsRegistry.setSubnodeOwner(ROOT_NODE, labelhash('reverse'), account)
    await PnsRegistry.setSubnodeOwner(
      namehash('reverse'),
      labelhash('addr'),
      ReverseRegistrar.address,
    )

    MetaDataservice = await deploy(
      'StaticMetadataService',
      'https://pulse.domains',
    )

    NameWrapper = await deploy(
      'NameWrapper',
      PnsRegistry.address,
      BaseRegistrar.address,
      MetaDataservice.address,
    )

    TestUnwrap = await deploy(
      'TestUnwrap',
      PnsRegistry.address,
      BaseRegistrar.address,
    )

    // setup .pls
    await PnsRegistry.setSubnodeOwner(
      ROOT_NODE,
      labelhash('pls'),
      BaseRegistrar.address,
    )

    //make sure base registrar is owner of pls TLD
    expect(await PnsRegistry.owner(namehash('pls'))).to.equal(
      BaseRegistrar.address,
    )
  })

  beforeEach(async () => {
    result = await ethers.provider.send('evm_snapshot')
  })
  afterEach(async () => {
    await ethers.provider.send('evm_revert', [result])
  })

  describe('wrapFromUpgrade()', () => {
    describe('.pls', () => {
      const encodedName = encodeName('wrapped.pls')
      const label = 'wrapped'
      const labelHash = labelhash(label)
      const nameHash = namehash(label + '.pls')

      it('allows unwrapping from an approved NameWrapper', async () => {
        await BaseRegistrar.register(labelHash, account, 1 * DAY)
        await BaseRegistrar.setApprovalForAll(NameWrapper.address, true)

        expect(await NameWrapper.ownerOf(nameHash)).to.equal(EMPTY_ADDRESS)

        await NameWrapper.wrapPLS2LD(
          label,
          account,
          CAN_DO_EVERYTHING,
          EMPTY_ADDRESS,
        )

        //make sure reclaim claimed ownership for the wrapper in registry

        expect(await PnsRegistry.owner(nameHash)).to.equal(NameWrapper.address)
        expect(await NameWrapper.ownerOf(nameHash)).to.equal(account)
        expect(await BaseRegistrar.ownerOf(labelHash)).to.equal(
          NameWrapper.address,
        )

        //set the upgradeContract of the NameWrapper contract
        await NameWrapper.setUpgradeContract(TestUnwrap.address)
        await TestUnwrap.setWrapperApproval(NameWrapper.address, true)

        await NameWrapper.upgrade(encodedName, 0)

        expect(await PnsRegistry.owner(nameHash)).to.equal(account)
        expect(await BaseRegistrar.ownerOf(labelHash)).to.equal(account)
        expect(await NameWrapper.ownerOf(nameHash)).to.equal(EMPTY_ADDRESS)
      })
      it('does not allow unwrapping from an unapproved NameWrapper', async () => {
        await BaseRegistrar.register(labelHash, account, 1 * DAY)
        await BaseRegistrar.nameExpires(labelHash)
        await BaseRegistrar.setApprovalForAll(NameWrapper.address, true)

        expect(await NameWrapper.ownerOf(nameHash)).to.equal(EMPTY_ADDRESS)

        await NameWrapper.wrapPLS2LD(
          label,
          account,
          CAN_DO_EVERYTHING,
          EMPTY_ADDRESS,
        )

        //make sure reclaim claimed ownership for the wrapper in registry

        expect(await PnsRegistry.owner(nameHash)).to.equal(NameWrapper.address)
        expect(await NameWrapper.ownerOf(nameHash)).to.equal(account)
        expect(await BaseRegistrar.ownerOf(labelHash)).to.equal(
          NameWrapper.address,
        )

        //set the upgradeContract of the NameWrapper contract
        await NameWrapper.setUpgradeContract(TestUnwrap.address)

        await expect(NameWrapper.upgrade(encodedName, 0)).to.be.revertedWith(
          'Unauthorised',
        )
      })
      it('does not allow unwrapping from an unapproved sender', async () => {
        await BaseRegistrar.register(labelHash, account, 1 * DAY)
        await BaseRegistrar.nameExpires(labelHash)
        await BaseRegistrar.setApprovalForAll(NameWrapper.address, true)

        expect(await NameWrapper.ownerOf(nameHash)).to.equal(EMPTY_ADDRESS)

        await NameWrapper.wrapPLS2LD(
          label,
          account,
          CAN_DO_EVERYTHING,
          EMPTY_ADDRESS,
        )

        //make sure reclaim claimed ownership for the wrapper in registry

        expect(await PnsRegistry.owner(nameHash)).to.equal(NameWrapper.address)
        expect(await NameWrapper.ownerOf(nameHash)).to.equal(account)
        expect(await BaseRegistrar.ownerOf(labelHash)).to.equal(
          NameWrapper.address,
        )

        //set the upgradeContract of the NameWrapper contract
        await NameWrapper.setUpgradeContract(TestUnwrap.address)
        await TestUnwrap.setWrapperApproval(NameWrapper.address, true)

        await expect(
          TestUnwrap.wrapFromUpgrade(
            encodedName,
            account,
            0,
            0,
            EMPTY_ADDRESS,
            0,
          ),
        ).to.be.revertedWith('Unauthorised')
      })
    })
    describe('other', () => {
      const label = 'to-upgrade'
      const parentLabel = 'wrapped2'
      const name = label + '.' + parentLabel + '.pls'
      const parentLabelHash = labelhash(parentLabel)
      const parentHash = namehash(parentLabel + '.pls')
      const nameHash = namehash(name)
      const encodedName = encodeName(name)
      it('allows unwrapping from an approved NameWrapper', async () => {
        await PnsRegistry.setApprovalForAll(NameWrapper.address, true)
        await BaseRegistrar.setApprovalForAll(NameWrapper.address, true)
        await BaseRegistrar.register(parentLabelHash, account, 1 * DAY)
        await NameWrapper.wrapPLS2LD(
          parentLabel,
          account,
          CANNOT_UNWRAP,
          EMPTY_ADDRESS,
        )
        await NameWrapper.setSubnodeOwner(
          parentHash,
          'to-upgrade',
          account,
          0,
          0,
        )
        const ownerOfWrapped = await NameWrapper.ownerOf(nameHash)
        expect(ownerOfWrapped).to.equal(account)

        //set the upgradeContract of the NameWrapper contract
        await NameWrapper.setUpgradeContract(TestUnwrap.address)
        await TestUnwrap.setWrapperApproval(NameWrapper.address, true)

        await NameWrapper.upgrade(encodedName, 0)

        expect(await PnsRegistry.owner(nameHash)).to.equal(account)
      })
      it('does not allow unwrapping from an unapproved NameWrapper', async () => {
        await PnsRegistry.setApprovalForAll(NameWrapper.address, true)
        await BaseRegistrar.setApprovalForAll(NameWrapper.address, true)
        await BaseRegistrar.register(parentLabelHash, account, 1 * DAY)
        await NameWrapper.wrapPLS2LD(
          parentLabel,
          account,
          CANNOT_UNWRAP,
          EMPTY_ADDRESS,
        )
        await NameWrapper.setSubnodeOwner(
          parentHash,
          'to-upgrade',
          account,
          0,
          0,
        )
        const ownerOfWrapped = await NameWrapper.ownerOf(nameHash)
        expect(ownerOfWrapped).to.equal(account)

        //set the upgradeContract of the NameWrapper contract
        await NameWrapper.setUpgradeContract(TestUnwrap.address)

        await expect(NameWrapper.upgrade(encodedName, 0)).to.be.revertedWith(
          'Unauthorised',
        )
      })
      it('does not allow unwrapping from an unapproved sender', async () => {
        await PnsRegistry.setApprovalForAll(NameWrapper.address, true)
        await BaseRegistrar.setApprovalForAll(NameWrapper.address, true)
        await BaseRegistrar.register(parentLabelHash, account, 1 * DAY)
        await NameWrapper.wrapPLS2LD(
          parentLabel,
          account,
          CANNOT_UNWRAP,
          EMPTY_ADDRESS,
        )
        await NameWrapper.setSubnodeOwner(
          parentHash,
          'to-upgrade',
          account,
          0,
          0,
        )
        const ownerOfWrapped = await NameWrapper.ownerOf(nameHash)
        expect(ownerOfWrapped).to.equal(account)

        //set the upgradeContract of the NameWrapper contract
        await NameWrapper.setUpgradeContract(TestUnwrap.address)
        await TestUnwrap.setWrapperApproval(NameWrapper.address, true)

        await expect(
          TestUnwrap.wrapFromUpgrade(
            encodedName,
            account,
            0,
            0,
            EMPTY_ADDRESS,
            0,
          ),
        ).to.be.revertedWith('Unauthorised')
      })
    })
  })
})
