const FIFSRegistrar = artifacts.require('./ethregistrar/FIFSRegistrar.sol')
const PNS = artifacts.require('./registry/PNSRegistry.sol')

const { exceptions } = require('../test-utils')
const sha3 = require('web3-utils').sha3
const namehash = require('eth-ens-namehash')

contract('FIFSRegistrar', function (accounts) {
  let registrar, pns

  beforeEach(async () => {
    pns = await PNS.new()
    registrar = await FIFSRegistrar.new(pns.address, '0x0')

    await pns.setOwner('0x0', registrar.address, { from: accounts[0] })
  })

  it('should allow registration of names', async () => {
    await registrar.register(sha3('pls'), accounts[0], { from: accounts[0] })
    assert.equal(await pns.owner('0x0'), registrar.address)
    assert.equal(await pns.owner(namehash.hash('pls')), accounts[0])
  })

  describe('transferring names', async () => {
    beforeEach(async () => {
      await registrar.register(sha3('pls'), accounts[0], { from: accounts[0] })
    })

    it('should allow transferring name to your own', async () => {
      await registrar.register(sha3('pls'), accounts[1], { from: accounts[0] })
      assert.equal(await pns.owner(namehash.hash('pls')), accounts[1])
    })

    it('forbids transferring the name you do not own', async () => {
      await exceptions.expectFailure(
        registrar.register(sha3('pls'), accounts[1], { from: accounts[1] }),
      )
    })
  })
})
