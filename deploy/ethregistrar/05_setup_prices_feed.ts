import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { deployer, owner } = await getNamedAccounts()

  // const fetchFlexOracle = await ethers.getContract('FetchFlexOracle')

  /**
   * 3 characters: $555/year
   * 4 characters: $169/year
   * 5+ characters: $5/year
   */
  // const ExponentialPremiumPriceOracle = await ethers.getContractFactory(
  //   'ExponentialPremiumPriceOracle',
  //   deployer,
  // )
  // const priceFeeds = await ExponentialPremiumPriceOracle.deploy(
  //   fetchFlexOracle.address,
  //   // [0, 0, '17598934550989', '5358954845256', '158548959919'],
  //   [0, 0, 0, 0, 0],
  //   '100000000000000000000000000',
  //   21,
  // )
  // await priceFeeds.deployed()
  // console.log('New price feed address', priceFeeds.address)

  const controller = await ethers.getContract('ETHRegistrarController', owner)

  /**
   * TESTNET: 0x7ea7CA53C35aA839003551f8ee72CB543FDAE1f0 (zero cost fee)
   * TESTNET: 0x3635780f51F09d0445ACA805930DFB2f79B5a6EB (normal cost fee)
   */
  const tx = await controller.changePricesFeed(
    '0x3635780f51F09d0445ACA805930DFB2f79B5a6EB',
  )
  console.log(`Updating new prices feed on (tx: ${tx.hash})...`)
  await tx.wait()
}

func.id = 'setup-prices-feed'
func.tags = ['SetupPricesFeed']
func.dependencies = ['ETHRegistrarController']

export default func
