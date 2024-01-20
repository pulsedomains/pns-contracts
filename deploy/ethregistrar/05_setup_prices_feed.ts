import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { deployer, owner } = await getNamedAccounts()

  const fetchFlexOracle = await ethers.getContract('FetchFlexOracle')

  /**
   * 3 characters: $555/year
   * 4 characters: $169/year
   * 5+ characters: $5/year
   */
  const ExponentialPremiumPriceOracle = await ethers.getContractFactory(
    'ExponentialPremiumPriceOracle',
    deployer,
  )
  const priceFeeds = await ExponentialPremiumPriceOracle.deploy(
    fetchFlexOracle.address,
    // [0, 0, '17598934550989', '5358954845256', '158548959919'],
    [0, 0, 0, 0, 0],
    '100000000000000000000000000',
    21,
  )
  await priceFeeds.deployed()
  console.log('New price feed address', priceFeeds.address)

  const controller = await ethers.getContract('PLSRegistrarController', owner)

  /**
   * TESTNET: 0x3EBdf4903D62349fbF215f959e2a1697331a992C (zero cost fee)
   * TESTNET: 0xc464F0095426Efce8b876d854Edb0FC3962971ae (normal cost fee)
   */
  /**
   * MAINNET: 0x590cC7B5D507d835A844E98137e55D9Bea0A6F78 (zero cost fee) $0 for all
   * MAINNET: 0x376D7eA5422ee63C5F3b717fCe63359Fc4cd4BeD (normal cost fee) $555/$169/$$5
   * MAINNET: 0x672689EBdBC24876F670B4FaBC69F413c038a700 (super high fee) $5550/$555/$555
   * MAINNET: 0x9bcaa2483E6d9083b510d86ce2D2c1F56fdaF2c7 (super low fee) $5 for all
   */
  const tx = await controller.changePricesFeed(
    priceFeeds.address,
    // '0x376D7eA5422ee63C5F3b717fCe63359Fc4cd4BeD',
  )
  console.log(`Updating new prices feed on (tx: ${tx.hash})...`)
  await tx.wait(2)
}

func.id = 'setup-prices-feed'
func.tags = ['SetupPricesFeed']
func.dependencies = ['PLSRegistrarController']

export default func
