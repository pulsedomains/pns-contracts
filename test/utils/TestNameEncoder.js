const TestNameEncoder = artifacts.require('TestNameEncoder.sol')
const { namehash } = require('../test-utils/pns')
const { dns } = require('../test-utils')

contract('UniversalResolver', function () {
  let testNameEncoder

  beforeEach(async () => {
    testNameEncoder = await TestNameEncoder.new()
  })

  describe('encodeName()', () => {
    it('should encode a name', async () => {
      const result = await testNameEncoder.encodeName('foo.pls')
      expect(result['0']).to.equal(dns.hexEncodeName('foo.pls'))
      expect(result['1']).to.equal(namehash('foo.pls'))
    })

    it('should encode an empty name', async () => {
      const result = await testNameEncoder.encodeName('')
      expect(result['0']).to.equal(dns.hexEncodeName(''))
      expect(result['1']).to.equal(namehash(''))
    })

    it('should encode a long name', async () => {
      const result = await testNameEncoder.encodeName('something.else.test.pls')
      expect(result['0']).to.equal(dns.hexEncodeName('something.else.test.pls'))
      expect(result['1']).to.equal(namehash('something.else.test.pls'))
    })
  })
})
