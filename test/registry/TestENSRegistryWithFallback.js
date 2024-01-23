const namehash = require('eth-ens-namehash')
const sha3 = require('web3-utils').sha3

const PNS = artifacts.require('PNSRegistryWithFallback.sol')

const PNSWithoutFallback = artifacts.require('./registry/PNSRegistry.sol')

contract('PNSRegistryWithFallback', function (accounts) {
  let old
  let pns

  beforeEach(async () => {
    old = await PNSWithoutFallback.new()
    pns = await PNS.new(old.address)
  })

  it('should allow setting the record', async () => {
    let result = await pns.setRecord('0x0', accounts[1], accounts[2], 3600, {
      from: accounts[0],
    })
    assert.equal(result.logs.length, 3)

    assert.equal(await pns.owner('0x0'), accounts[1])
    assert.equal(await pns.resolver('0x0'), accounts[2])
    assert.equal((await pns.ttl('0x0')).toNumber(), 3600)
  })

  it('should allow setting subnode records', async () => {
    let result = await pns.setSubnodeRecord(
      '0x0',
      sha3('test'),
      accounts[1],
      accounts[2],
      3600,
      { from: accounts[0] },
    )

    let hash = namehash.hash('test')
    assert.equal(await pns.owner(hash), accounts[1])
    assert.equal(await pns.resolver(hash), accounts[2])
    assert.equal((await pns.ttl(hash)).toNumber(), 3600)
  })

  it('should implement authorisations/operators', async () => {
    await pns.setApprovalForAll(accounts[1], true, { from: accounts[0] })
    await pns.setOwner('0x0', accounts[2], { from: accounts[1] })
    assert.equal(await pns.owner('0x0'), accounts[2])
  })

  describe('fallback', async () => {
    let hash = namehash.hash('pls')

    beforeEach(async () => {
      await old.setSubnodeOwner('0x0', sha3('pls'), accounts[0], {
        from: accounts[0],
      })
    })

    it('should use fallback ttl if owner not set', async () => {
      let hash = namehash.hash('pls')
      await old.setSubnodeOwner('0x0', sha3('pls'), accounts[0], {
        from: accounts[0],
      })
      await old.setTTL(hash, 3600, { from: accounts[0] })
      assert.equal((await pns.ttl(hash)).toNumber(), 3600)
    })

    it('should use fallback owner if owner not set', async () => {
      await old.setOwner(hash, accounts[0], { from: accounts[0] })
      assert.equal(await pns.owner(hash), accounts[0])
    })

    it('should use fallback resolver if owner not set', async () => {
      await old.setResolver(hash, accounts[0], { from: accounts[0] })
      assert.equal(await pns.resolver(hash), accounts[0])
    })
  })
})
