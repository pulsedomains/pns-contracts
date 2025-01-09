const {
  evm,
  reverse: { getReverseNode },
  contracts: { deploy },
  pns: { FUSES },
} = require('../test-utils')

const { CANNOT_UNWRAP, PARENT_CANNOT_CONTROL, IS_DOT_PLS } = FUSES

const { expect } = require('chai')

const { ethers } = require('hardhat')
const provider = ethers.provider
const { namehash } = require('../test-utils/pns')
const sha3 = require('web3-utils').sha3
const {
  EMPTY_BYTES32: EMPTY_BYTES,
  EMPTY_ADDRESS: ZERO_ADDRESS,
} = require('../test-utils/constants')

const DAY = 24 * 60 * 60
const REGISTRATION_TIME = 28 * DAY
const BUFFERED_REGISTRATION_COST = REGISTRATION_TIME + 3 * DAY
const GRACE_PERIOD = 30 * DAY
const NULL_ADDRESS = ZERO_ADDRESS
contract('PLSRegistrarController', function () {
  let pns
  let resolver
  let resolver2 // resolver signed by accounts[1]
  let baseRegistrar
  let controller
  let controller2 // controller signed by accounts[1]
  let priceOracle
  let reverseRegistrar
  let nameWrapper
  let callData

  const secret =
    '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF'
  let ownerAccount // Account that owns the registrar
  let registrantAccount // Account that owns test names
  let accounts = []

  async function registerName(
    name,
    txOptions = { value: BUFFERED_REGISTRATION_COST },
  ) {
    var commitment = await controller.makeCommitment({
      name: name,
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: NULL_ADDRESS,
      data: [],
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })
    var tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await provider.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())

    var tx = await controller.register(
      {
        name: name,
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: NULL_ADDRESS,
        data: [],
        reverseRecord: false,
        ownerControlledFuses: 0,
        referrer: NULL_ADDRESS,
      },
      txOptions,
    )

    return tx
  }

  before(async () => {
    signers = await ethers.getSigners()
    ownerAccount = await signers[0].getAddress()
    registrantAccount = await signers[1].getAddress()
    accounts = [ownerAccount, registrantAccount, signers[2].getAddress()]

    pns = await deploy('PNSRegistry')

    baseRegistrar = await deploy(
      'BaseRegistrarImplementation',
      pns.address,
      namehash('pls'),
    )

    reverseRegistrar = await deploy('ReverseRegistrar', pns.address)

    await pns.setSubnodeOwner(EMPTY_BYTES, sha3('reverse'), accounts[0])
    await pns.setSubnodeOwner(
      namehash('reverse'),
      sha3('addr'),
      reverseRegistrar.address,
    )

    nameWrapper = await deploy(
      'NameWrapper',
      pns.address,
      baseRegistrar.address,
      ownerAccount,
    )

    await pns.setSubnodeOwner(EMPTY_BYTES, sha3('pls'), baseRegistrar.address)

    const dummyOracle = await deploy('DummyOracle', '100000000')
    priceOracle = await deploy(
      'StablePriceOracle',
      dummyOracle.address,
      [0, 0, 4, 2, 1],
    )
    controller = await deploy(
      'PLSRegistrarController',
      baseRegistrar.address,
      priceOracle.address,
      600,
      86400,
      reverseRegistrar.address,
      nameWrapper.address,
      pns.address,
    )
    controller2 = controller.connect(signers[1])
    await nameWrapper.setController(controller.address, true)
    await baseRegistrar.addController(nameWrapper.address)
    await reverseRegistrar.setController(controller.address, true)

    resolver = await deploy(
      'PublicResolver',
      pns.address,
      nameWrapper.address,
      controller.address,
      reverseRegistrar.address,
    )

    callData = [
      resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [
        namehash('newconfigname.pls'),
        registrantAccount,
      ]),
      resolver.interface.encodeFunctionData('setText', [
        namehash('newconfigname.pls'),
        'url',
        'pulsechain.com',
      ]),
    ]

    resolver2 = await resolver.connect(signers[1])
  })

  beforeEach(async () => {
    result = await ethers.provider.send('evm_snapshot')
  })
  afterEach(async () => {
    await ethers.provider.send('evm_revert', [result])
  })

  const checkLabels = {
    testing: true,
    longname12345678: true,
    sixsix: true,
    five5: true,
    four: true,
    iii: true,
    ii: false,
    i: false,
    '': false,

    // { ni } { hao } { ma } (chinese; simplified)
    你好吗: true,

    // { ta } { ko } (japanese; hiragana)
    たこ: false,

    // { poop } { poop } { poop } (emoji)
    '\ud83d\udca9\ud83d\udca9\ud83d\udca9': true,

    // { poop } { poop } (emoji)
    '\ud83d\udca9\ud83d\udca9': false,
  }

  it('should report label validity', async () => {
    for (const label in checkLabels) {
      expect(await controller.valid(label)).to.equal(checkLabels[label], label)
    }
  })

  it('should report unused names as available', async () => {
    expect(await controller.available(sha3('available'))).to.equal(true)
  })

  it('should permit new registrations', async () => {
    const name = 'newname'
    const balanceBefore = await web3.eth.getBalance(controller.address)
    const tx = await registerName(name)
    const block = await provider.getBlock(tx.blockNumber)
    await expect(tx)
      .to.emit(controller, 'NameRegistered')
      .withArgs(
        name,
        sha3(name),
        registrantAccount,
        REGISTRATION_TIME,
        0,
        block.timestamp + REGISTRATION_TIME,
      )

    expect(
      (await web3.eth.getBalance(controller.address)) - balanceBefore,
    ).to.equal(REGISTRATION_TIME)
  })

  it('should revert when not enough ether is transferred', async () => {
    await expect(registerName('newname', { value: 0 })).to.be.revertedWith(
      'InsufficientValue()',
    )
  })

  it('should report registered names as unavailable', async () => {
    const name = 'newname'
    await registerName(name)
    expect(await controller.available(name)).to.equal(false)
  })

  it('should permit new registrations with resolver and records', async () => {
    var commitment = await controller2.makeCommitment({
      name: 'newconfigname',
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: resolver.address,
      data: callData,
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })
    var tx = await controller2.commit(commitment)
    expect(await controller2.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller2.minCommitmentAge()).toNumber())
    var balanceBefore = await web3.eth.getBalance(controller.address)
    var tx = await controller2.register(
      {
        name: 'newconfigname',
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: resolver.address,
        data: callData,
        reverseRecord: false,
        ownerControlledFuses: 0,
        referrer: NULL_ADDRESS,
      },
      { value: BUFFERED_REGISTRATION_COST },
    )

    const block = await provider.getBlock(tx.blockNumber)

    await expect(tx)
      .to.emit(controller, 'NameRegistered')
      .withArgs(
        'newconfigname',
        sha3('newconfigname'),
        registrantAccount,
        REGISTRATION_TIME,
        0,
        block.timestamp + REGISTRATION_TIME,
      )

    expect(
      (await web3.eth.getBalance(controller.address)) - balanceBefore,
    ).to.equal(REGISTRATION_TIME)

    var nodehash = namehash('newconfigname.pls')
    expect(await pns.resolver(nodehash)).to.equal(resolver.address)
    expect(await pns.owner(nodehash)).to.equal(nameWrapper.address)
    expect(await baseRegistrar.ownerOf(sha3('newconfigname'))).to.equal(
      nameWrapper.address,
    )
    expect(await resolver['addr(bytes32)'](nodehash)).to.equal(
      registrantAccount,
    )
    expect(await resolver['text'](nodehash, 'url')).to.equal('pulsechain.com')
    expect(await nameWrapper.ownerOf(nodehash)).to.equal(registrantAccount)
  })

  it('should not permit new registrations with 0 resolver', async () => {
    await expect(
      controller.makeCommitment({
        name: 'newconfigname',
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: NULL_ADDRESS,
        data: callData,
        reverseRecord: false,
        ownerControlledFuses: 0,
        referrer: NULL_ADDRESS,
      }),
    ).to.be.revertedWith('ResolverRequiredWhenDataSupplied()')
  })

  it('should not permit new registrations with EoA resolver', async () => {
    const commitment = await controller.makeCommitment({
      name: 'newconfigname',
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: registrantAccount,
      data: callData,
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })

    const tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await expect(
      controller.register(
        {
          name: 'newconfigname',
          owner: registrantAccount,
          duration: REGISTRATION_TIME,
          secret: secret,
          resolver: registrantAccount,
          data: callData,
          reverseRecord: false,
          ownerControlledFuses: 0,
          referrer: NULL_ADDRESS,
        },
        { value: BUFFERED_REGISTRATION_COST },
      ),
    ).to.be.reverted
  })

  it('should not permit new registrations with an incompatible contract', async () => {
    const commitment = await controller.makeCommitment({
      name: 'newconfigname',
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: controller.address,
      data: callData,
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })

    const tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await expect(
      controller.register(
        {
          name: 'newconfigname',
          owner: registrantAccount,
          duration: REGISTRATION_TIME,
          secret: secret,
          resolver: controller.address,
          data: callData,
          reverseRecord: false,
          ownerControlledFuses: 0,
          referrer: NULL_ADDRESS,
        },
        { value: BUFFERED_REGISTRATION_COST },
      ),
    ).to.be.revertedWith(
      "Transaction reverted: function selector was not recognized and there's no fallback function",
    )
  })

  it('should not permit new registrations with records updating a different name', async () => {
    const commitment = await controller2.makeCommitment({
      name: 'awesome',
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: resolver.address,
      data: [
        resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [
          namehash('othername.pls'),
          registrantAccount,
        ]),
      ],
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })
    const tx = await controller2.commit(commitment)
    expect(await controller2.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller2.minCommitmentAge()).toNumber())

    await expect(
      controller2.register(
        {
          name: 'awesome',
          owner: registrantAccount,
          duration: REGISTRATION_TIME,
          secret: secret,
          resolver: resolver.address,
          data: [
            resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [
              namehash('othername.pls'),
              registrantAccount,
            ]),
          ],
          reverseRecord: false,
          ownerControlledFuses: 0,
          referrer: NULL_ADDRESS,
        },
        { value: BUFFERED_REGISTRATION_COST },
      ),
    ).to.be.revertedWith('multicall: All records must have a matching namehash')
  })

  it('should not permit new registrations with any record updating a different name', async () => {
    const commitment = await controller2.makeCommitment({
      name: 'awesome',
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: resolver.address,
      data: [
        resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [
          namehash('awesome.pls'),
          registrantAccount,
        ]),
        resolver.interface.encodeFunctionData(
          'setText(bytes32,string,string)',
          [namehash('other.pls'), 'url', 'pulsechain.com'],
        ),
      ],
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })
    const tx = await controller2.commit(commitment)
    expect(await controller2.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller2.minCommitmentAge()).toNumber())

    await expect(
      controller2.register(
        {
          name: 'awesome',
          owner: registrantAccount,
          duration: REGISTRATION_TIME,
          secret: secret,
          resolver: resolver.address,
          data: [
            resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [
              namehash('awesome.pls'),
              registrantAccount,
            ]),
            resolver.interface.encodeFunctionData(
              'setText(bytes32,string,string)',
              [namehash('other.pls'), 'url', 'pulsechain.com'],
            ),
          ],
          reverseRecord: false,
          ownerControlledFuses: 0,
          referrer: NULL_ADDRESS,
        },
        { value: BUFFERED_REGISTRATION_COST },
      ),
    ).to.be.revertedWith('multicall: All records must have a matching namehash')
  })

  it('should permit a registration with resolver but no records', async () => {
    const commitment = await controller.makeCommitment({
      name: 'newconfigname2',
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: resolver.address,
      data: [],
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })
    let tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    const balanceBefore = await web3.eth.getBalance(controller.address)
    let tx2 = await controller.register(
      {
        name: 'newconfigname2',
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: resolver.address,
        data: [],
        reverseRecord: false,
        ownerControlledFuses: 0,
        referrer: NULL_ADDRESS,
      },
      { value: BUFFERED_REGISTRATION_COST },
    )

    const block = await provider.getBlock(tx2.blockNumber)

    await expect(tx2)
      .to.emit(controller, 'NameRegistered')
      .withArgs(
        'newconfigname2',
        sha3('newconfigname2'),
        registrantAccount,
        REGISTRATION_TIME,
        0,
        block.timestamp + REGISTRATION_TIME,
      )

    const nodehash = namehash('newconfigname2.pls')
    expect(await pns.resolver(nodehash)).to.equal(resolver.address)
    expect(await resolver['addr(bytes32)'](nodehash)).to.equal(NULL_ADDRESS)
    expect(
      (await web3.eth.getBalance(controller.address)) - balanceBefore,
    ).to.equal(REGISTRATION_TIME)
  })

  it('should include the owner in the commitment', async () => {
    await controller.commit(
      await controller.makeCommitment({
        name: 'newname2',
        owner: accounts[2],
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: NULL_ADDRESS,
        data: [],
        reverseRecord: false,
        ownerControlledFuses: 0,
        referrer: NULL_ADDRESS,
      }),
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await expect(
      controller.register(
        {
          name: 'newname2',
          owner: registrantAccount,
          duration: REGISTRATION_TIME,
          secret: secret,
          resolver: NULL_ADDRESS,
          data: [],
          reverseRecord: false,
          ownerControlledFuses: 0,
          referrer: NULL_ADDRESS,
        },
        {
          value: BUFFERED_REGISTRATION_COST,
        },
      ),
    ).to.be.reverted
  })

  it('should reject duplicate registrations', async () => {
    const label = 'newname'
    await registerName(label)
    await controller.commit(
      await controller.makeCommitment({
        name: label,
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: NULL_ADDRESS,
        data: [],
        reverseRecord: false,
        ownerControlledFuses: 0,
        referrer: NULL_ADDRESS,
      }),
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await expect(
      controller.register(
        {
          name: label,
          owner: registrantAccount,
          duration: REGISTRATION_TIME,
          secret: secret,
          resolver: NULL_ADDRESS,
          data: [],
          reverseRecord: false,
          ownerControlledFuses: 0,
          referrer: NULL_ADDRESS,
        },
        {
          value: BUFFERED_REGISTRATION_COST,
        },
      ),
    ).to.be.revertedWith(`NameNotAvailable("${label}")`)
  })

  it('should reject for expired commitments', async () => {
    const commitment = await controller.makeCommitment({
      name: 'newname2',
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: NULL_ADDRESS,
      data: [],
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })
    await controller.commit(commitment)

    await evm.advanceTime((await controller.maxCommitmentAge()).toNumber() + 1)
    await expect(
      controller.register(
        {
          name: 'newname2',
          owner: registrantAccount,
          duration: REGISTRATION_TIME,
          secret: secret,
          resolver: NULL_ADDRESS,
          data: [],
          reverseRecord: false,
          ownerControlledFuses: 0,
          referrer: NULL_ADDRESS,
        },
        {
          value: BUFFERED_REGISTRATION_COST,
        },
      ),
    ).to.be.revertedWith(`CommitmentTooOld("${commitment}")`)
  })

  it('should allow anyone to renew a name without changing fuse expiry', async () => {
    await registerName('newname')
    var nodehash = namehash('newname.pls')
    var fuseExpiry = (await nameWrapper.getData(nodehash))[2]
    var expires = await baseRegistrar.nameExpires(sha3('newname'))
    var balanceBefore = await web3.eth.getBalance(controller.address)
    const duration = 86400
    const [price] = await controller.rentPrice(sha3('newname'), duration)
    await controller.renew('newname', duration, { value: price })
    var newExpires = await baseRegistrar.nameExpires(sha3('newname'))
    var newFuseExpiry = (await nameWrapper.getData(nodehash))[2]
    expect(newExpires.toNumber() - expires.toNumber()).to.equal(duration)
    expect(newFuseExpiry.toNumber() - fuseExpiry.toNumber()).to.equal(86400)

    expect(
      (await web3.eth.getBalance(controller.address)) - balanceBefore,
    ).to.equal(86400)
  })

  it('should allow token owners to renew a name', async () => {
    const CANNOT_UNWRAP = 1
    const PARENT_CANNOT_CONTROL = 64

    await registerName('newname')
    var nodehash = namehash('newname.pls')
    const [, fuses, fuseExpiry] = await nameWrapper.getData(nodehash)

    var expires = await baseRegistrar.nameExpires(sha3('newname'))
    var balanceBefore = await web3.eth.getBalance(controller.address)
    const duration = 86400
    const [price] = await controller.rentPrice(sha3('newname'), duration)
    await controller2.renew('newname', duration, { value: price })
    var newExpires = await baseRegistrar.nameExpires(sha3('newname'))
    const [, newFuses, newFuseExpiry] = await nameWrapper.getData(nodehash)
    expect(newExpires.toNumber() - expires.toNumber()).to.equal(duration)
    expect(newFuseExpiry.toNumber() - fuseExpiry.toNumber()).to.equal(duration)
    expect(newFuses).to.equal(fuses)
    expect(
      (await web3.eth.getBalance(controller.address)) - balanceBefore,
    ).to.equal(86400)
  })

  it('non wrapped names can renew', async () => {
    const label = 'newname'
    const tokenId = sha3(label)
    const nodehash = namehash(`${label}.pls`)
    // this is to allow user to register without namewrapped
    await baseRegistrar.addController(ownerAccount)
    await baseRegistrar.register(tokenId, ownerAccount, 84600)

    expect(await nameWrapper.ownerOf(nodehash)).to.equal(ZERO_ADDRESS)
    expect(await baseRegistrar.ownerOf(tokenId)).to.equal(ownerAccount)

    var expires = await baseRegistrar.nameExpires(tokenId)
    const duration = 86400
    const [price] = await controller.rentPrice(tokenId, duration)
    await controller.renew(label, duration, { value: price })

    expect(await baseRegistrar.ownerOf(tokenId)).to.equal(ownerAccount)
    expect(await nameWrapper.ownerOf(nodehash)).to.equal(ZERO_ADDRESS)
    var newExpires = await baseRegistrar.nameExpires(tokenId)
    expect(newExpires.toNumber() - expires.toNumber()).to.equal(duration)
  })

  it('should require sufficient value for a renewal', async () => {
    await expect(controller.renew('name', 86400)).to.be.revertedWith(
      'InsufficientValue()',
    )
  })

  it('should allow anyone to withdraw funds and transfer to the registrar owner', async () => {
    await controller.withdraw({ from: ownerAccount })
    expect(parseInt(await web3.eth.getBalance(controller.address))).to.equal(0)
  })

  it('should set the reverse record of the account', async () => {
    const commitment = await controller.makeCommitment({
      name: 'reverse',
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: resolver.address,
      data: [],
      reverseRecord: true,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })
    await controller.commit(commitment)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await controller.register(
      {
        name: 'reverse',
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: resolver.address,
        data: [],
        reverseRecord: true,
        ownerControlledFuses: 0,
        referrer: NULL_ADDRESS,
      },
      { value: BUFFERED_REGISTRATION_COST },
    )

    expect(await resolver.name(getReverseNode(ownerAccount))).to.equal(
      'reverse.pls',
    )
  })

  it('should not set the reverse record of the account when set to false', async () => {
    const commitment = await controller.makeCommitment({
      name: 'noreverse',
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: resolver.address,
      data: [],
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })
    await controller.commit(commitment)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await controller.register(
      {
        name: 'noreverse',
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: resolver.address,
        data: [],
        reverseRecord: false,
        ownerControlledFuses: 0,
        referrer: NULL_ADDRESS,
      },
      { value: BUFFERED_REGISTRATION_COST },
    )

    expect(await resolver.name(getReverseNode(ownerAccount))).to.equal('')
  })

  it('should auto wrap the name and set the ERC721 owner to the wrapper', async () => {
    const label = 'wrapper'
    const name = label + '.pls'
    const commitment = await controller.makeCommitment({
      name: label,
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: resolver.address,
      data: [],
      reverseRecord: true,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })
    await controller.commit(commitment)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await controller.register(
      {
        name: label,
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: resolver.address,
        data: [],
        reverseRecord: true,
        ownerControlledFuses: 0,
        referrer: NULL_ADDRESS,
      },
      { value: BUFFERED_REGISTRATION_COST },
    )

    expect(await nameWrapper.ownerOf(namehash(name))).to.equal(
      registrantAccount,
    )

    expect(await pns.owner(namehash(name))).to.equal(nameWrapper.address)
    expect(await baseRegistrar.ownerOf(sha3(label))).to.equal(
      nameWrapper.address,
    )
  })

  it('should auto wrap the name and allow fuses and expiry to be set', async () => {
    const MAX_INT_64 = 2n ** 64n - 1n
    const label = 'fuses'
    const name = label + '.pls'
    const commitment = await controller.makeCommitment({
      name: label,
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: resolver.address,
      data: [],
      reverseRecord: true,
      ownerControlledFuses: 1,
      referrer: NULL_ADDRESS,
    })
    await controller.commit(commitment)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    const tx = await controller.register(
      {
        name: label,
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: resolver.address,
        data: [],
        reverseRecord: true,
        ownerControlledFuses: 1,
        referrer: NULL_ADDRESS,
      },
      { value: BUFFERED_REGISTRATION_COST },
    )

    const block = await provider.getBlock(tx.block)

    const [, fuses, expiry] = await nameWrapper.getData(namehash(name))
    expect(fuses).to.equal(PARENT_CANNOT_CONTROL | CANNOT_UNWRAP | IS_DOT_PLS)
    expect(expiry).to.equal(REGISTRATION_TIME + GRACE_PERIOD + block.timestamp)
  })

  it('approval should reduce gas for registration', async () => {
    const label = 'other'
    const name = label + '.pls'
    const node = namehash(name)
    const commitment = await controller.makeCommitment({
      name: label,
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: resolver.address,
      data: [
        resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [
          node,
          registrantAccount,
        ]),
      ],
      reverseRecord: true,
      ownerControlledFuses: 1,
      referrer: NULL_ADDRESS,
    })

    await controller.commit(commitment)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())

    const gasA = await controller2.estimateGas.register(
      {
        name: label,
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: resolver.address,
        data: [
          resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [
            node,
            registrantAccount,
          ]),
        ],
        reverseRecord: true,
        ownerControlledFuses: 1,
        referrer: NULL_ADDRESS,
      },
      { value: BUFFERED_REGISTRATION_COST },
    )

    await resolver2.setApprovalForAll(controller.address, true)

    const gasB = await controller2.estimateGas.register(
      {
        name: label,
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: resolver2.address,
        data: [
          resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [
            node,
            registrantAccount,
          ]),
        ],
        reverseRecord: true,
        ownerControlledFuses: 1,
        referrer: NULL_ADDRESS,
      },
      { value: BUFFERED_REGISTRATION_COST },
    )

    const tx = await controller2.register(
      {
        name: label,
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: resolver2.address,
        data: [
          resolver.interface.encodeFunctionData('setAddr(bytes32,address)', [
            node,
            registrantAccount,
          ]),
        ],
        reverseRecord: true,
        ownerControlledFuses: 1,
        referrer: NULL_ADDRESS,
      },
      { value: BUFFERED_REGISTRATION_COST },
    )

    console.log((await tx.wait()).gasUsed.toString())

    console.log(gasA.toString(), gasB.toString())

    expect(await nameWrapper.ownerOf(node)).to.equal(registrantAccount)
    expect(await pns.owner(namehash(name))).to.equal(nameWrapper.address)
    expect(await baseRegistrar.ownerOf(sha3(label))).to.equal(
      nameWrapper.address,
    )
    expect(await resolver2['addr(bytes32)'](node)).to.equal(registrantAccount)
  })

  it('should not permit new registrations with non resolver function calls', async () => {
    const label = 'newconfigname'
    const name = `${label}.pls`
    const node = namehash(name)
    const secondTokenDuration = 788400000 // keep bogus NFT for 25 years;
    const callData = [
      baseRegistrar.interface.encodeFunctionData(
        'register(uint256,address,uint)',
        [node, registrantAccount, secondTokenDuration],
      ),
    ]
    var commitment = await controller.makeCommitment({
      name: label,
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: baseRegistrar.address,
      data: callData,
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: NULL_ADDRESS,
    })
    var tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )
    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await expect(
      controller.register(
        {
          name: label,
          owner: registrantAccount,
          duration: REGISTRATION_TIME,
          secret: secret,
          resolver: baseRegistrar.address,
          data: callData,
          reverseRecord: false,
          ownerControlledFuses: 0,
          referrer: NULL_ADDRESS,
        },
        { value: BUFFERED_REGISTRATION_COST },
      ),
    ).to.be.revertedWith(
      "Transaction reverted: function selector was not recognized and there's no fallback function",
    )
  })

  it('should give 10% register fee to referrer', async () => {
    const name = 'referral'
    const referrer = await signers[2].getAddress()
    const referrerBalanceBefore = await web3.eth.getBalance(referrer)

    const balanceBefore = await web3.eth.getBalance(controller.address)

    var commitment = await controller.makeCommitment({
      name,
      owner: registrantAccount,
      duration: REGISTRATION_TIME,
      secret: secret,
      resolver: NULL_ADDRESS,
      data: [],
      reverseRecord: false,
      ownerControlledFuses: 0,
      referrer: referrer,
    })
    var tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await provider.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())

    var tx = await controller.register(
      {
        name: name,
        owner: registrantAccount,
        duration: REGISTRATION_TIME,
        secret: secret,
        resolver: NULL_ADDRESS,
        data: [],
        reverseRecord: false,
        ownerControlledFuses: 0,
        referrer: referrer,
      },
      { value: BUFFERED_REGISTRATION_COST },
    )

    expect(
      BigInt(await web3.eth.getBalance(referrer)) -
        BigInt(referrerBalanceBefore),
    ).to.equal(BigInt((REGISTRATION_TIME * 10) / 100))
    expect(
      (await web3.eth.getBalance(controller.address)) - balanceBefore,
    ).to.equal((REGISTRATION_TIME * 90) / 100)
  })
})
